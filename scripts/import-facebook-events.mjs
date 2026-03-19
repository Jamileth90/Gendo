/**
 * import-facebook-events.mjs
 *
 * Importa eventos de Facebook (JSON de Apify) a gendo.db.
 * Detecta la ciudad automáticamente desde "location.city" o "location.name"
 * y la relaciona con la tabla cities.
 *
 * Uso:
 *   node scripts/import-facebook-events.mjs [archivo.json] [--dry-run]
 *
 * Ejemplo:
 *   node scripts/import-facebook-events.mjs facebook-events.json
 *   node scripts/import-facebook-events.mjs facebook-events.json --dry-run
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname }         from 'path';
import { fileURLToPath }            from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL ?? resolve(__dir, '../gendo.db');
const DRY_RUN = process.argv.includes('--dry-run');
const FILE    = process.argv.find(a => a.endsWith('.json'))
             ?? resolve(__dir, '../facebook-events.json');

if (!existsSync(FILE)) {
	console.error(`❌  No se encontró el archivo: ${FILE}`);
	process.exit(1);
}

// ── Clasificador de tipo de evento ────────────────────────────────────────────
function classifyEvent(name = '', organizer = '') {
	const t = `${name} ${organizer}`.toLowerCase();
	if (/fish|fishing|pesca|bass|trout|walleye|angling|tackle/.test(t))   return 'pesca';
	if (/yoga|pilates|mindfulness|meditation|zen|wellness/.test(t))        return 'yoga';
	if (/bike|cycling|ciclismo|trail|hiking|kayak|outdoor|run\b|race/.test(t)) return 'sports';
	if (/music|concert|band|show|live|festival|perform/.test(t))           return 'live_music';
	if (/food|eat|taste|chef|market|gastro|culinary|dinner|brunch/.test(t)) return 'food';
	if (/art|gallery|exhibit|museum|theater|theatre|comedy|film|cinema/.test(t)) return 'art';
	if (/sport|game|tournament|championship|league|match|cup/.test(t))    return 'sports';
	return 'festival';
}

// ── Parsear ciudad desde texto libre ─────────────────────────────────────────
function parseCityName(locationCity = '', locationName = '') {
	// "Buffalo, NY, United States" → "Buffalo"
	// "New York, NY" → "New York"
	const raw = locationCity || locationName || '';
	const first = raw.split(',')[0].trim();
	return first || null;
}

// ── Buscar o crear ciudad en la BD ────────────────────────────────────────────
const cityCache = new Map();
function resolveCityId(db, cityName) {
	if (!cityName) return null;
	const key = cityName.toLowerCase();
	if (cityCache.has(key)) return cityCache.get(key);

	const existing = db.prepare(
		`SELECT id FROM cities WHERE lower(name) = lower(?)`
	).get(cityName);

	if (existing) { cityCache.set(key, existing.id); return existing.id; }

	// Crear ciudad nueva
	const res = db.prepare(
		`INSERT INTO cities (name, country, country_code) VALUES (?, 'United States', 'US')`
	).run(cityName);
	const id = Number(res.lastInsertRowid);
	cityCache.set(key, id);
	console.log(`   🌆 Ciudad nueva creada: ${cityName} (id=${id})`);
	return id;
}

// ── Buscar o crear venue genérico para el evento ──────────────────────────────
function resolveVenueId(db, locationName, cityId) {
	if (!locationName || !cityId) return null;
	const name = locationName.split(',')[0].trim(); // solo el nombre del venue
	if (!name) return null;

	const existing = db.prepare(
		`SELECT id FROM venues WHERE lower(name) = lower(?) AND city_id = ?`
	).get(name, cityId);
	if (existing) return existing.id;

	const res = db.prepare(
		`INSERT INTO venues (city_id, name, type, address, active)
		 VALUES (?, ?, 'other', ?, 1)`
	).run(cityId, name, locationName);
	return Number(res.lastInsertRowid);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
	const raw     = JSON.parse(readFileSync(FILE, 'utf8'));
	const records = Array.isArray(raw) ? raw : [raw];

	console.log(`\n📋  Archivo    : ${FILE}`);
	console.log(`📊  Registros  : ${records.length}${DRY_RUN ? '  [DRY-RUN]' : ''}\n`);

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	const checkDupe  = db.prepare(`SELECT id FROM events WHERE external_id = ?`);
	const insertEvt  = db.prepare(`
		INSERT INTO events
		  (venue_id, city_id, title, date_start, type,
		   image_url, source_url, source, status, price, tags, external_id)
		VALUES
		  (@venue_id, @city_id, @title, @date_start, @type,
		   @image_url, @source_url, 'facebook', 'active', 'free', '[]', @external_id)
	`);

	const counters = { inserted: 0, skipped_dupe: 0, skipped_no_date: 0, skipped_no_city: 0 };
	const preview  = [];

	db.transaction(() => {
		for (const rec of records) {
			// Campos del JSON de Apify Facebook Events
			const name         = rec.name ?? rec.title;
			const dateStr      = rec.utcStartDate ?? rec.startDate;
			const locationCity = rec['location.city'] ?? rec.location?.city ?? '';
			const locationName = rec['location.name'] ?? rec.location?.name ?? '';
			const imageUrl     = rec.imageUrl ?? rec.image_url ?? null;
			const eventUrl     = rec.url ?? rec.pageUrl ?? null;
			const organizer    = rec.organizedBy ?? '';

			if (!name) continue;

			if (!dateStr) { counters.skipped_no_date++; continue; }

			const dateTs = Math.floor(new Date(dateStr).getTime() / 1000);
			if (isNaN(dateTs)) { counters.skipped_no_date++; continue; }

			const cityName = parseCityName(locationCity, locationName);
			if (!cityName) { counters.skipped_no_city++; continue; }

			const type = classifyEvent(name, organizer);

			preview.push({ name: name.slice(0, 50), city: cityName, type });

			if (DRY_RUN) { counters.inserted++; continue; }

			// Evitar duplicados por URL
			if (eventUrl && checkDupe.get(eventUrl)) { counters.skipped_dupe++; continue; }

			const cityId  = resolveCityId(db, cityName);
			const venueId = resolveVenueId(db, locationName, cityId);

			insertEvt.run({
				venue_id:    venueId,
				city_id:     cityId,
				title:       name,
				date_start:  dateTs,
				type,
				image_url:   imageUrl,
				source_url:  eventUrl,
				external_id: eventUrl,
			});
			counters.inserted++;
		}
	})();

	// ── Resumen ───────────────────────────────────────────────────────────────
	console.log('📋  Preview (todos los eventos encontrados):');
	const typeIcons = { pesca:'🐟', yoga:'🧘', sports:'🏟️', live_music:'🎵', food:'🍽️', art:'🎨', festival:'🎪' };
	preview.forEach(p =>
		console.log(`   ${typeIcons[p.type] ?? '📅'} [${p.type.padEnd(10)}] ${p.name} — ${p.city}`)
	);

	console.log(`\n✅  Resultado:`);
	if (DRY_RUN) {
		console.log(`   Listos para importar : ${counters.inserted}`);
		console.log(`   Sin fecha            : ${counters.skipped_no_date}`);
		console.log(`   Sin ciudad           : ${counters.skipped_no_city}`);
		console.log(`\nℹ️  Ejecuta sin --dry-run para guardar en la BD.`);
	} else {
		console.log(`   Insertados   : ${counters.inserted}`);
		console.log(`   Duplicados   : ${counters.skipped_dupe}`);
		console.log(`   Sin fecha    : ${counters.skipped_no_date}`);
		console.log(`   Sin ciudad   : ${counters.skipped_no_city}`);
		console.log(`\n🌐  Abre http://localhost:5173 para verlos.`);
	}

	db.close();
}

main();
