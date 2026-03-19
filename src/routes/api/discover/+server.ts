/**
 * POST /api/discover   — Búsqueda autónoma por radio GPS
 * GET  /api/discover?lat=X&lng=Y
 *
 * Pipeline completa: caché → geocode → Apify → clasificar → persistir en DB
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { all, get, run, exec } from '$lib/db/client';
import { env } from '$env/dynamic/private';
import { classify, CATEGORY_STYLE, CATEGORY_TO_TYPE } from '$lib/classify';

const CACHE_TTL    = 24 * 60 * 60;
const GEO_TTL      = 7  * 24 * 60 * 60;
const ZONE_DEC     = 2;
const GEO_DEC      = 1;
const ACTOR_ID     = 'compass~crawler-google-places';
const MAX_PER_TERM = 9;
const MIN_RATING   = 4.0;
const MIN_REVIEWS  = 30;
const APIFY_WAIT   = 120;
const EVENT_WINDOW = 7 * 24 * 60 * 60;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse?format=json';

const SEARCH_TERMS = [
	'parque naturaleza', 'yoga bienestar spa', 'pesca playa lago', 'ciclismo bicicleta',
	'restaurantes bares comida', 'teatro cine museo arte', 'discoteca club noche bares',
	'eventos conciertos festival',
];

interface GeoInfo { city: string; state: string | null; country: string; countryCode: string; }
interface DiscoveredPlace {
	id: string; title: string; category: string; type: string;
	lat: number | null; lng: number | null; address: string;
	rating: number | null; reviews: number; website: string | null; phone: string | null;
	googleCat: string | null; style: typeof CATEGORY_STYLE[keyof typeof CATEGORY_STYLE]; source: 'discovery';
}
interface ImportStats { citiesCreated: number; venuesUpserted: number; eventsUpserted: number; }

function zoneKey(lat: number, lng: number, dec = ZONE_DEC): string {
	return `${lat.toFixed(dec)}|${lng.toFixed(dec)}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371, r = Math.PI / 180;
	const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(a));
}

async function reverseGeocode(lat: number, lng: number): Promise<GeoInfo> {
	const gLat = lat.toFixed(GEO_DEC), gLng = lng.toFixed(GEO_DEC);
	const now = Math.floor(Date.now() / 1000);

	const cached = await get<{ city: string; state: string | null; country: string; country_code: string }>(
		`SELECT city, state, country, country_code FROM geocode_cache WHERE lat_zone = ? AND lng_zone = ? AND (? - created_at) < ?`,
		gLat, gLng, now, GEO_TTL
	);
	if (cached) return { city: cached.city, state: cached.state, country: cached.country, countryCode: cached.country_code };

	try {
		const res = await fetch(`${NOMINATIM_URL}&lat=${lat}&lon=${lng}&zoom=10`,
			{ headers: { 'User-Agent': 'Gendo-App/1.0 (contact@gendo.app)' } });
		if (res.ok) {
			const data = await res.json() as { address?: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string; country_code?: string } };
			const addr = data.address ?? {};
			const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? 'Unknown';
			const state = addr.state ?? null;
			const country = addr.country ?? 'Unknown';
			const countryCode = (addr.country_code ?? 'XX').toUpperCase();

			await run(`INSERT INTO geocode_cache (lat_zone, lng_zone, city, state, country, country_code, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(lat_zone, lng_zone) DO UPDATE SET city = excluded.city, state = excluded.state,
				country = excluded.country, country_code = excluded.country_code, created_at = excluded.created_at`,
				gLat, gLng, city, state, country, countryCode, now);
			return { city, state, country, countryCode };
		}
	} catch { /* fallback */ }

	const nearest = await get<{ name: string; state: string | null; country: string; country_code: string }>(
		`SELECT name, state, country, country_code FROM cities WHERE lat IS NOT NULL AND lng IS NOT NULL
		 ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) LIMIT 1`, lat, lat, lng, lng);
	if (nearest) return { city: nearest.name, state: nearest.state, country: nearest.country, countryCode: nearest.country_code };

	return { city: 'Local', state: null, country: 'Unknown', countryCode: 'XX' };
}

async function resolveCityId(geo: GeoInfo, lat: number, lng: number): Promise<number> {
	const existing = await get<{ id: number }>(`SELECT id FROM cities WHERE name = ? AND country_code = ? LIMIT 1`, geo.city, geo.countryCode);
	if (existing) return existing.id;

	const nearby = await all<{ id: number; lat: number; lng: number }>(`SELECT id, lat, lng FROM cities WHERE lat IS NOT NULL AND lng IS NOT NULL LIMIT 200`);
	for (const c of nearby) {
		if (haversineKm(lat, lng, c.lat, c.lng) < 30) return c.id;
	}

	const res = await run(`INSERT INTO cities (name, country, country_code, state, lat, lng) VALUES (?, ?, ?, ?, ?, ?)`,
		geo.city, geo.country, geo.countryCode, geo.state, lat, lng);
	return res.lastInsertRowid != null ? Number(res.lastInsertRowid) : 0;
}

async function upsertVenue(place: DiscoveredPlace, cityId: number): Promise<number> {
	const existing = await get<{ id: number }>(`SELECT id FROM venues WHERE external_id = ? LIMIT 1`, place.id);
	if (existing) {
		const now = Math.floor(Date.now() / 1000);
		await run(`UPDATE venues SET name = ?, type = ?, address = ?, lat = ?, lng = ?, website = ?, phone = ?, city_id = ?, updated_at = ? WHERE id = ?`,
			place.title, place.type, place.address, place.lat, place.lng, place.website, place.phone, cityId, now, existing.id);
		return existing.id;
	}
	const res = await run(`INSERT INTO venues (city_id, name, type, address, lat, lng, website, phone, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		cityId, place.title, place.type, place.address, place.lat, place.lng, place.website, place.phone, place.id);
	return res.lastInsertRowid != null ? Number(res.lastInsertRowid) : 0;
}

async function upsertRollingEvent(place: DiscoveredPlace, venueId: number, cityId: number): Promise<'created' | 'updated' | 'skipped'> {
	const now = Math.floor(Date.now() / 1000);
	const extId = `gps:${place.id}`;

	const existing = await get<{ id: number; date_start: number }>(`SELECT id, date_start FROM events WHERE external_id = ? LIMIT 1`, extId);
	if (existing) {
		await run(`UPDATE events SET date_start = ?, date_end = ?, updated_at = ? WHERE id = ?`, now, now + EVENT_WINDOW, now, existing.id);
		return 'updated';
	}

	const tags = JSON.stringify([place.category, place.googleCat].filter(Boolean));
	const desc = [place.googleCat ? `Categoría: ${place.googleCat}` : null, place.rating ? `Rating Google Maps: ⭐ ${place.rating.toFixed(1)} (${place.reviews} reseñas)` : null,
		place.address ? `📍 ${place.address}` : null, place.website ? `🌐 ${place.website}` : null, place.phone ? `📞 ${place.phone}` : null].filter(Boolean).join('\n');

	await run(`INSERT INTO events (city_id, venue_id, title, type, date_start, date_end, lat, lng, source, price, status, description, tags, external_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'discovery_gps', 'free', 'active', ?, ?, ?)`,
		cityId, venueId, place.title, place.type, now, now + EVENT_WINDOW, place.lat, place.lng, desc, tags, extId);
	return 'created';
}

function buildSearchUrls(lat: number, lng: number): string[] {
	return SEARCH_TERMS.map(term => `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},14z`);
}

async function runApifyScraper(lat: number, lng: number): Promise<unknown[]> {
	const token = env.APIFY_TOKEN;
	if (!token) throw new Error('APIFY_TOKEN no configurado');
	const input = { startUrls: buildSearchUrls(lat, lng).map(url => ({ url })), maxCrawledPlacesPerSearch: MAX_PER_TERM, maxCrawledPlaces: MAX_PER_TERM * SEARCH_TERMS.length, exportPlaceUrls: false, deeperCityScrape: false, scrapeContacts: true, scrapeReviewsPersonalData: false };
	const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&waitForFinish=${APIFY_WAIT}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
	if (!runRes.ok) {
		const txt = await runRes.text().catch(() => '');
		if (runRes.status === 402) throw new Error('Apify está ocupado con otras búsquedas. Inténtalo en unos minutos.');
		throw new Error(`Apify error ${runRes.status}: ${txt.slice(0, 200)}`);
	}
	const runData = await runRes.json() as { data?: { defaultDatasetId?: string } };
	const datasetId = runData?.data?.defaultDatasetId;
	if (!datasetId) throw new Error('Apify no devolvió dataset ID');
	const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=200`);
	if (!dataRes.ok) throw new Error(`Error al leer dataset Apify: ${dataRes.status}`);
	return await dataRes.json() as unknown[];
}

function filterAndClassify(items: unknown[]): DiscoveredPlace[] {
	const results: DiscoveredPlace[] = [];
	for (const raw of items) {
		const item = raw as Record<string, unknown>;
		const rating = (item.totalScore as number) ?? (item.stars as number) ?? 0;
		const reviews = (item.reviewsCount as number) ?? (item.userRatingsTotal as number) ?? 0;
		if (rating > 0 && rating < MIN_RATING && reviews < MIN_REVIEWS) continue;
		if (rating === 0 && reviews < MIN_REVIEWS) continue;
		const title = ((item.title as string) ?? (item.name as string) ?? '').trim();
		const desc = ((item.description as string) ?? '').trim();
		const address = ((item.address as string) ?? '').trim();
		const googleCat = ((item.categoryName as string) ?? (item.category as string) ?? '').trim();
		if (!title) continue;
		const cat = classify(title, desc, address, googleCat);
		if (!cat) continue;
		const loc = item.location as { lat?: number; lng?: number } | undefined;
		results.push({ id: ((item.placeId as string) ?? (item.id as string) ?? `${title}|${address}`), title, category: cat, type: CATEGORY_TO_TYPE[cat], lat: loc?.lat ?? (item.lat as number) ?? null, lng: loc?.lng ?? (item.lng as number) ?? null, address, rating: rating || null, reviews, website: (item.website as string) ?? null, phone: (item.phone as string) ?? null, googleCat: googleCat || null, style: CATEGORY_STYLE[cat], source: 'discovery' });
	}
	return results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

async function persistToDb(places: DiscoveredPlace[], lat: number, lng: number): Promise<ImportStats & { cityName: string; countryCode: string }> {
	const stats: ImportStats = { citiesCreated: 0, venuesUpserted: 0, eventsUpserted: 0 };
	const geo = await reverseGeocode(lat, lng);
	const cityId = await resolveCityId(geo, lat, lng);

	const cityCheck = await get<{ created_at: number }>(`SELECT created_at FROM cities WHERE id = ?`, cityId);
	const isNewCity = cityCheck && (Math.floor(Date.now() / 1000) - cityCheck.created_at) < 10;
	if (isNewCity) stats.citiesCreated++;

	for (const place of places) {
		try {
			const venueId = await upsertVenue(place, cityId);
			stats.venuesUpserted++;
			const status = await upsertRollingEvent(place, venueId, cityId);
			if (status === 'created' || status === 'updated') stats.eventsUpserted++;
		} catch (e) {
			console.warn('[discover persist]', (e as Error).message?.slice(0, 80));
		}
	}
	return { ...stats, cityName: geo.city, countryCode: geo.countryCode };
}

async function ensureSchema() {
	await exec(`
		CREATE TABLE IF NOT EXISTS discovery_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, zone_key TEXT NOT NULL UNIQUE, results_json TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')));
		CREATE INDEX IF NOT EXISTS idx_discovery_zone ON discovery_cache(zone_key);
		CREATE TABLE IF NOT EXISTS geocode_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, lat_zone TEXT NOT NULL, lng_zone TEXT NOT NULL, city TEXT NOT NULL, state TEXT, country TEXT NOT NULL, country_code TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')), UNIQUE(lat_zone, lng_zone));
		CREATE INDEX IF NOT EXISTS idx_geocode_zone ON geocode_cache(lat_zone, lng_zone)
	`);
}

async function discover(lat: number, lng: number) {
	await ensureSchema();
	const key = zoneKey(lat, lng);
	const now = Math.floor(Date.now() / 1000);

	const cached = await get<{ results_json: string; created_at: number }>(`SELECT results_json, created_at FROM discovery_cache WHERE zone_key = ?`, key);
	if (cached && now - cached.created_at < CACHE_TTL) {
		return { results: JSON.parse(cached.results_json) as DiscoveredPlace[], cached: true, cachedAt: cached.created_at * 1000, zone: key, imported: null };
	}

	if (!env.APIFY_TOKEN) {
		return { results: [], cached: false, zone: key, imported: null, needsToken: true };
	}

	const rawItems = await runApifyScraper(lat, lng);
	const results = filterAndClassify(rawItems);
	const imported = await persistToDb(results, lat, lng);

	await run(`INSERT INTO discovery_cache (zone_key, results_json, count, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(zone_key) DO UPDATE SET results_json = excluded.results_json, count = excluded.count, created_at = excluded.created_at`, key, JSON.stringify(results), results.length, now);

	return { results, cached: false, zone: key, imported };
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as { lat?: unknown; lng?: unknown };
		const lat = typeof body.lat === 'number' ? body.lat : parseFloat(String(body.lat));
		const lng = typeof body.lng === 'number' ? body.lng : parseFloat(String(body.lng));
		if (!isFinite(lat) || !isFinite(lng)) return json({ error: 'lat y lng deben ser números válidos' }, { status: 400 });
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
		if (!isFinite(lat) || !isFinite(lng)) return json({ error: 'Parámetros lat y lng requeridos' }, { status: 400 });
		const result = await discover(lat, lng);
		return json(result);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[discover GET]', msg);
		return json({ error: msg, results: [] }, { status: 500 });
	}
};
