/**
 * POST /api/discover   — Búsqueda autónoma por radio GPS
 * GET  /api/discover?lat=X&lng=Y
 *
 * Pipeline completa:
 *  1. Recibe { lat, lng } del usuario
 *  2. Revisa caché de zona (24 h, ~1.1 km × 1.1 km)
 *  3. Geocodificación inversa con Nominatim (OpenStreetMap, gratis, sin API key)
 *     → ciudad y país automáticos desde las coordenadas
 *  4. Llama a Apify compass/crawler-google-places con 6 términos bilingüe
 *  5. Clasifica resultados con el motor bilingüe ES+EN de Gendo
 *  6. Filtra por relevancia: rating ≥ 4.0 ó reviews ≥ 30
 *  7. Persiste en gendo.db:
 *       cities  → crea/reutiliza ciudad detectada
 *       venues  → crea/actualiza cada lugar (UPSERT por external_id)
 *       events  → crea evento "rolling" con ventana de 7 días (UPSERT)
 *  8. Actualiza caché y devuelve resultados con estadísticas de importación
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { classify, CATEGORY_STYLE, CATEGORY_TO_TYPE } from '$lib/classify';

// ── Configuración ─────────────────────────────────────────────────────────────
const DB_PATH      = './gendo.db';
const CACHE_TTL    = 24 * 60 * 60;            // segundos — 24 horas por zona
const GEO_TTL      = 7  * 24 * 60 * 60;       // 7 días para geocode cache
const ZONE_DEC     = 2;                        // ~1.1 km × 1.1 km por celda
const GEO_DEC      = 1;                        // ~11 km para geocode cache
const ACTOR_ID     = 'compass~crawler-google-places';
const MAX_PER_TERM = 9;                        // 9 × 6 términos ≈ 54 — ~50 lugares/eventos populares
const MIN_RATING   = 4.0;                      // Filtro de calidad: solo lugares con 4+ estrellas
const MIN_REVIEWS  = 30;                       // O ≥30 reseñas si no hay rating
const APIFY_WAIT   = 120;                      // segundos de espera sincrónica
const EVENT_WINDOW = 7 * 24 * 60 * 60;        // eventos duran 7 días en el feed

// Nominatim (OpenStreetMap) — sin API key, respetar 1 req/s
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse?format=json';

// ── Términos de búsqueda bilingüe (uno por categoría) ─────────────────────────
// Google Maps responde en el idioma local. Cubre redes sociales + páginas propias.
// Términos para ~50 lugares/eventos populares (8 términos × ~7 resultados)
const SEARCH_TERMS = [
	'parque naturaleza',
	'yoga bienestar spa',
	'pesca playa lago',
	'ciclismo bicicleta',
	'restaurantes bares comida',
	'teatro cine museo arte',
	'discoteca club noche bares',
	'eventos conciertos festival',
];

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface GeoInfo {
	city:         string;
	state:        string | null;
	country:      string;
	countryCode:  string;
}

interface DiscoveredPlace {
	id:        string;
	title:     string;
	category:  string;
	type:      string;
	lat:       number | null;
	lng:       number | null;
	address:   string;
	rating:    number | null;
	reviews:   number;
	website:   string | null;
	phone:     string | null;
	googleCat: string | null;
	style:     typeof CATEGORY_STYLE[keyof typeof CATEGORY_STYLE];
	source:    'discovery';
}

interface ImportStats {
	citiesCreated:  number;
	venuesUpserted: number;
	eventsUpserted: number;
}

// ── Helpers geográficos ───────────────────────────────────────────────────────
function zoneKey(lat: number, lng: number, dec = ZONE_DEC): string {
	return `${lat.toFixed(dec)}|${lng.toFixed(dec)}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371, r = Math.PI / 180;
	const dLat = (lat2 - lat1) * r;
	const dLng = (lng2 - lng1) * r;
	const a = Math.sin(dLat / 2) ** 2
		+ Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Geocodificación inversa (Nominatim + caché DB) ────────────────────────────
async function reverseGeocode(db: InstanceType<typeof Database>, lat: number, lng: number): Promise<GeoInfo> {
	const gLat = lat.toFixed(GEO_DEC);
	const gLng = lng.toFixed(GEO_DEC);
	const now  = Math.floor(Date.now() / 1000);

	// 1. Intentar desde caché
	const cached = db.prepare(
		`SELECT city, state, country, country_code FROM geocode_cache
		 WHERE lat_zone = ? AND lng_zone = ? AND (? - created_at) < ?`
	).get(gLat, gLng, now, GEO_TTL) as { city: string; state: string | null; country: string; country_code: string } | undefined;

	if (cached) {
		return { city: cached.city, state: cached.state, country: cached.country, countryCode: cached.country_code };
	}

	// 2. Llamar a Nominatim (gratis, sin API key)
	try {
		const res = await fetch(
			`${NOMINATIM_URL}&lat=${lat}&lon=${lng}&zoom=10`,   // Nominatim usa 'lon', no 'lng'
			{ headers: { 'User-Agent': 'Gendo-App/1.0 (contact@gendo.app)' } }
		);
		if (res.ok) {
			const data = await res.json() as {
				address?: {
					city?: string; town?: string; village?: string; county?: string;
					state?: string; country?: string; country_code?: string;
				}
			};
			const addr  = data.address ?? {};
			const city  = addr.city ?? addr.town ?? addr.village ?? addr.county ?? 'Unknown';
			const state = addr.state ?? null;
			const country     = addr.country     ?? 'Unknown';
			const countryCode = (addr.country_code ?? 'XX').toUpperCase();

			// Guardar en caché
			db.prepare(`
				INSERT INTO geocode_cache (lat_zone, lng_zone, city, state, country, country_code, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(lat_zone, lng_zone) DO UPDATE SET
					city = excluded.city, state = excluded.state,
					country = excluded.country, country_code = excluded.country_code,
					created_at = excluded.created_at
			`).run(gLat, gLng, city, state, country, countryCode, now);

			return { city, state, country, countryCode };
		}
	} catch { /* si Nominatim falla, usamos fallback */ }

	// 3. Fallback — buscar ciudad más cercana en la BD
	const nearest = db.prepare(
		`SELECT name, state, country, country_code FROM cities
		 WHERE lat IS NOT NULL AND lng IS NOT NULL
		 ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?))
		 LIMIT 1`
	).get(lat, lat, lng, lng) as { name: string; state: string | null; country: string; country_code: string } | undefined;

	if (nearest) return { city: nearest.name, state: nearest.state, country: nearest.country, countryCode: nearest.country_code };

	return { city: 'Local', state: null, country: 'Unknown', countryCode: 'XX' };
}

// ── Resolución de ciudad (find-or-create) ─────────────────────────────────────
function resolveCityId(
	db:     InstanceType<typeof Database>,
	geo:    GeoInfo,
	lat:    number,
	lng:    number
): number {
	// 1. Ciudad existente con el mismo nombre y país
	const existing = db.prepare(
		`SELECT id FROM cities WHERE name = ? AND country_code = ? LIMIT 1`
	).get(geo.city, geo.countryCode) as { id: number } | undefined;

	if (existing) return existing.id;

	// 2. Ciudad cercana (< 30 km) para evitar duplicados por variaciones de nombre
	const nearby = db.prepare(
		`SELECT id, lat, lng FROM cities WHERE lat IS NOT NULL AND lng IS NOT NULL LIMIT 200`
	).all() as { id: number; lat: number; lng: number }[];

	for (const c of nearby) {
		if (haversineKm(lat, lng, c.lat, c.lng) < 30) return c.id;
	}

	// 3. Crear nueva ciudad
	const res = db.prepare(`
		INSERT INTO cities (name, country, country_code, state, lat, lng)
		VALUES (?, ?, ?, ?, ?, ?)
	`).run(geo.city, geo.country, geo.countryCode, geo.state, lat, lng);

	return res.lastInsertRowid as number;
}

// ── Upsert de venue ───────────────────────────────────────────────────────────
function upsertVenue(
	db:       InstanceType<typeof Database>,
	place:    DiscoveredPlace,
	cityId:   number
): number {
	const existing = db.prepare(
		`SELECT id FROM venues WHERE external_id = ? LIMIT 1`
	).get(place.id) as { id: number } | undefined;

	if (existing) {
		// Actualizar datos frescos
		db.prepare(`
			UPDATE venues SET
				name    = ?, type = ?, address = ?,
				lat     = ?, lng  = ?,
				website = ?, phone = ?,
				city_id = ?,
				updated_at = strftime('%s','now')
			WHERE id = ?
		`).run(place.title, place.type, place.address,
			place.lat, place.lng, place.website, place.phone,
			cityId, existing.id);
		return existing.id;
	}

	// Insertar nuevo venue
	const res = db.prepare(`
		INSERT INTO venues (city_id, name, type, address, lat, lng, website, phone, external_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(cityId, place.title, place.type, place.address,
		place.lat, place.lng, place.website, place.phone, place.id);

	return res.lastInsertRowid as number;
}

// ── Upsert de evento "rolling" (ventana de 7 días) ────────────────────────────
function upsertRollingEvent(
	db:       InstanceType<typeof Database>,
	place:    DiscoveredPlace,
	venueId:  number,
	cityId:   number
): 'created' | 'updated' | 'skipped' {
	const now    = Math.floor(Date.now() / 1000);
	const extId  = `gps:${place.id}`;           // prefijo para no colisionar con otros scrapers

	const existing = db.prepare(
		`SELECT id, date_start FROM events WHERE external_id = ? LIMIT 1`
	).get(extId) as { id: number; date_start: number } | undefined;

	if (existing) {
		// Si el evento ya existe, extender la ventana a los próximos 7 días desde hoy
		db.prepare(`
			UPDATE events SET
				date_start = ?, date_end = ?,
				updated_at = strftime('%s','now')
			WHERE id = ?
		`).run(now, now + EVENT_WINDOW, existing.id);
		return 'updated';
	}

	// Crear nuevo evento
	const tags = JSON.stringify([place.category, place.googleCat].filter(Boolean));
	const desc = [
		place.googleCat ? `Categoría: ${place.googleCat}` : null,
		place.rating    ? `Rating Google Maps: ⭐ ${place.rating.toFixed(1)} (${place.reviews} reseñas)` : null,
		place.address   ? `📍 ${place.address}` : null,
		place.website   ? `🌐 ${place.website}` : null,
		place.phone     ? `📞 ${place.phone}` : null,
	].filter(Boolean).join('\n');

	db.prepare(`
		INSERT INTO events
			(city_id, venue_id, title, type, date_start, date_end,
			 lat, lng, source, price, status, description, tags, external_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'discovery_gps', 'free', 'active', ?, ?, ?)
	`).run(
		cityId, venueId, place.title, place.type,
		now, now + EVENT_WINDOW,
		place.lat, place.lng,
		desc, tags, extId
	);
	return 'created';
}

// ── Scraper Apify ─────────────────────────────────────────────────────────────
function buildSearchUrls(lat: number, lng: number): string[] {
	return SEARCH_TERMS.map(term =>
		`https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},14z`
	);
}

async function runApifyScraper(lat: number, lng: number): Promise<unknown[]> {
	const token = env.APIFY_TOKEN;
	if (!token) throw new Error('APIFY_TOKEN no configurado en .env');

	const input = {
		startUrls:                 buildSearchUrls(lat, lng).map(url => ({ url })),
		maxCrawledPlacesPerSearch: MAX_PER_TERM,
		maxCrawledPlaces:          MAX_PER_TERM * SEARCH_TERMS.length,
		exportPlaceUrls:           false,
		deeperCityScrape:          false,
		scrapeContacts:            true,
		scrapeReviewsPersonalData: false,
	};

	const runRes = await fetch(
		`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&waitForFinish=${APIFY_WAIT}`,
		{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
	);
	if (!runRes.ok) {
		const txt = await runRes.text().catch(() => '');
		if (runRes.status === 402) {
			throw new Error('Apify está ocupado con otras búsquedas. Inténtalo en unos minutos.');
		}
		throw new Error(`Apify error ${runRes.status}: ${txt.slice(0, 200)}`);
	}

	const runData   = await runRes.json() as { data?: { defaultDatasetId?: string } };
	const datasetId = runData?.data?.defaultDatasetId;
	if (!datasetId) throw new Error('Apify no devolvió dataset ID');

	const dataRes = await fetch(
		`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=200`
	);
	if (!dataRes.ok) throw new Error(`Error al leer dataset Apify: ${dataRes.status}`);

	return await dataRes.json() as unknown[];
}

// ── Clasificación y filtrado ──────────────────────────────────────────────────
function filterAndClassify(items: unknown[]): DiscoveredPlace[] {
	const results: DiscoveredPlace[] = [];

	for (const raw of items) {
		const item     = raw as Record<string, unknown>;
		const rating   = (item.totalScore  as number) ?? (item.stars as number)          ?? 0;
		const reviews  = (item.reviewsCount as number) ?? (item.userRatingsTotal as number) ?? 0;

		// Filtro de calidad: 4+ estrellas en Google Maps O ≥30 reseñas
		if (rating > 0 && rating < MIN_RATING && reviews < MIN_REVIEWS) continue;
		if (rating === 0 && reviews < MIN_REVIEWS) continue;

		const title     = ((item.title as string)       ?? (item.name as string)        ?? '').trim();
		const desc      = ((item.description as string) ?? '').trim();
		const address   = ((item.address as string)     ?? '').trim();
		const googleCat = ((item.categoryName as string) ?? (item.category as string)   ?? '').trim();

		if (!title) continue;

		const cat = classify(title, desc, address, googleCat);
		if (!cat) continue;

		const loc = item.location as { lat?: number; lng?: number } | undefined;

		results.push({
			id:        ((item.placeId as string) ?? (item.id as string) ?? `${title}|${address}`),
			title,
			category:  cat,
			type:      CATEGORY_TO_TYPE[cat],
			lat:       loc?.lat ?? (item.lat as number) ?? null,
			lng:       loc?.lng ?? (item.lng as number) ?? null,
			address,
			rating:    rating || null,
			reviews,
			website:   (item.website as string) ?? null,
			phone:     (item.phone   as string) ?? null,
			googleCat: googleCat || null,
			style:     CATEGORY_STYLE[cat],
			source:    'discovery',
		});
	}

	return results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

// ── Persistencia en gendo.db ──────────────────────────────────────────────────
async function persistToDb(
	db:      InstanceType<typeof Database>,
	places:  DiscoveredPlace[],
	lat:     number,
	lng:     number
): Promise<ImportStats & { cityName: string; countryCode: string }> {
	const stats: ImportStats = { citiesCreated: 0, venuesUpserted: 0, eventsUpserted: 0 };

	// Geocodificación inversa — obtener ciudad desde coordenadas
	const geo    = await reverseGeocode(db, lat, lng);
	const cityId = resolveCityId(db, geo, lat, lng);

	// Verificar si la ciudad fue creada nueva
	const cityCheck = db.prepare(`SELECT created_at FROM cities WHERE id = ?`).get(cityId) as { created_at: number } | undefined;
	const isNewCity = cityCheck && (Math.floor(Date.now() / 1000) - cityCheck.created_at) < 10;
	if (isNewCity) stats.citiesCreated++;

	// Persistir cada lugar en una transacción
	const persist = db.transaction(() => {
		for (const place of places) {
			try {
				const venueId = upsertVenue(db, place, cityId);
				stats.venuesUpserted++;

				const status = upsertRollingEvent(db, place, venueId, cityId);
				if (status === 'created' || status === 'updated') stats.eventsUpserted++;
			} catch (e) {
				// Ignorar errores individuales (ej. duplicados de FTS)
				console.warn('[discover persist]', (e as Error).message?.slice(0, 80));
			}
		}
	});
	persist();

	return { ...stats, cityName: geo.city, countryCode: geo.countryCode };
}

// ── Inicialización de la BD ───────────────────────────────────────────────────
function getDb(): InstanceType<typeof Database> {
	const db = new Database(DB_PATH);
	db.exec(`
		CREATE TABLE IF NOT EXISTS discovery_cache (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			zone_key     TEXT    NOT NULL UNIQUE,
			results_json TEXT    NOT NULL,
			count        INTEGER NOT NULL DEFAULT 0,
			created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
		);
		CREATE INDEX IF NOT EXISTS idx_discovery_zone ON discovery_cache(zone_key);
		CREATE TABLE IF NOT EXISTS geocode_cache (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			lat_zone     TEXT    NOT NULL,
			lng_zone     TEXT    NOT NULL,
			city         TEXT    NOT NULL,
			state        TEXT,
			country      TEXT    NOT NULL,
			country_code TEXT    NOT NULL,
			created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
			UNIQUE(lat_zone, lng_zone)
		);
		CREATE INDEX IF NOT EXISTS idx_geocode_zone ON geocode_cache(lat_zone, lng_zone);
	`);
	return db;
}

// ── Pipeline principal ────────────────────────────────────────────────────────
async function discover(lat: number, lng: number) {
	const db  = getDb();
	const key = zoneKey(lat, lng);
	const now = Math.floor(Date.now() / 1000);

	// ── 1. Revisar caché ─────────────────────────────────────────────────────
	const cached = db.prepare(
		`SELECT results_json, created_at FROM discovery_cache WHERE zone_key = ?`
	).get(key) as { results_json: string; created_at: number } | undefined;

	if (cached && now - cached.created_at < CACHE_TTL) {
		db.close();
		return {
			results:  JSON.parse(cached.results_json) as DiscoveredPlace[],
			cached:   true,
			cachedAt: cached.created_at * 1000,
			zone:     key,
			imported: null,
		};
	}

	// ── 2. Scraping con Apify ────────────────────────────────────────────────
	const rawItems = await runApifyScraper(lat, lng);
	const results  = filterAndClassify(rawItems);

	// ── 3. Persistir en gendo.db ─────────────────────────────────────────────
	const imported = await persistToDb(db, results, lat, lng);

	// ── 4. Actualizar caché ──────────────────────────────────────────────────
	db.prepare(`
		INSERT INTO discovery_cache (zone_key, results_json, count, created_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(zone_key) DO UPDATE SET
			results_json = excluded.results_json,
			count        = excluded.count,
			created_at   = excluded.created_at
	`).run(key, JSON.stringify(results), results.length, now);

	db.close();
	return { results, cached: false, zone: key, imported };
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as { lat?: unknown; lng?: unknown };
		const lat  = typeof body.lat === 'number' ? body.lat : parseFloat(String(body.lat));
		const lng  = typeof body.lng === 'number' ? body.lng : parseFloat(String(body.lng));
		if (!isFinite(lat) || !isFinite(lng))
			return json({ error: 'lat y lng deben ser números válidos' }, { status: 400 });

		const result = await discover(lat, lng);
		return json(result);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[discover POST]', msg);
		return json({ error: msg, results: [] }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const lat = parseFloat(url.searchParams.get('lat') ?? '');
		const lng = parseFloat(url.searchParams.get('lng') ?? '');
		if (!isFinite(lat) || !isFinite(lng))
			return json({ error: 'Parámetros lat y lng requeridos' }, { status: 400 });

		const result = await discover(lat, lng);
		return json(result);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[discover GET]', msg);
		return json({ error: msg, results: [] }, { status: 500 });
	}
};
