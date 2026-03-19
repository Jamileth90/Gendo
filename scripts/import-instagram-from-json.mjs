/**
 * import-instagram-from-json.mjs
 *
 * Importa cuentas/lugares de Instagram desde instagram.json (exportado de Apify)
 * a gendo.db como venues. Clasifica por categoría (pesca, yoga, ciclismo, social).
 *
 * Uso:
 *   node scripts/import-instagram-from-json.mjs [archivo.json] [--dry-run]
 *
 * Por defecto lee: instagram.json en la raíz del proyecto
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL ?? resolve(__dir, '../gendo.db');
const DRY_RUN = process.argv.includes('--dry-run');
const FILE    = process.argv.find(a => a.endsWith('.json'))
             ?? resolve(__dir, '../instagram.json');

if (!existsSync(FILE)) {
	console.log(`⏭️  No existe instagram.json — omitiendo`);
	process.exit(0);
}

// Clasificador bilingüe (igual que import-apify-social)
const CLASSIFIERS = [
	{ type: 'pesca',    re: /\b(pesca|fish|fishing|beach|playa|surf|kayak)\b/i },
	{ type: 'yoga',     re: /\b(yoga|pilates|wellness|spa|meditation|mindfulness)\b/i },
	{ type: 'ciclismo', re: /\b(bike|cycling|ciclismo|trail|hike|outdoor|park|parque)\b/i },
	{ type: 'social',   re: /\b(bar|restaurant|food|event|concert|party|nightlife|art|museum|theater)\b/i },
];

function classify(text = '') {
	const t = text.toLowerCase();
	for (const { type, re } of CLASSIFIERS) {
		if (re.test(t)) return type;
	}
	return 'social';
}

// Detectar ciudad/país desde caption o inputUrl
function detectLocation(item) {
	const caption = item.caption || '';
	const input   = item.inputUrl || '';
	// "Humans of New York" → New York
	if (/new york|nyc|manhattan|brooklyn/i.test(caption + input)) return { city: 'New York', cc: 'US' };
	if (/miami|florida|fl\b/i.test(caption + input)) return { city: 'Miami', cc: 'US' };
	if (/los angeles|la\b|california/i.test(caption + input)) return { city: 'Los Angeles', cc: 'US' };
	if (/chicago|illinois/i.test(caption + input)) return { city: 'Chicago', cc: 'US' };
	if (/quito|guayaquil|ecuador/i.test(caption + input)) return { city: 'Quito', cc: 'EC' };
	if (/mexico|cdmx|ciudad de mexico/i.test(caption + input)) return { city: 'Mexico City', cc: 'MX' };
	return { city: 'Unknown', cc: 'US' };
}

const cityCache = new Map();
function resolveCityId(db, cityName, countryCode) {
	const key = `${cityName}|${countryCode}`.toLowerCase();
	if (cityCache.has(key)) return cityCache.get(key);
	const existing = db.prepare(
		`SELECT id FROM cities WHERE lower(name) = lower(?) AND country_code = ?`
	).get(cityName, countryCode);
	if (existing) { cityCache.set(key, existing.id); return existing.id; }
	const res = db.prepare(
		`INSERT INTO cities (name, country, country_code) VALUES (?, ?, ?)`
	).run(cityName, countryCode === 'US' ? 'United States' : countryCode, countryCode);
	const id = Number(res.lastInsertRowid);
	cityCache.set(key, id);
	return id;
}

async function main() {
	console.log(`\n📸  Importando Instagram desde ${FILE}${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

	const raw = readFileSync(FILE, 'utf8');
	let items;
	try {
		items = JSON.parse(raw);
	} catch (e) {
		console.error('❌  JSON inválido');
		process.exit(1);
	}
	if (!Array.isArray(items)) items = [items];

	const db = DRY_RUN ? null : new Database(DB_PATH);
	const findVenue = db?.prepare(`SELECT id FROM venues WHERE external_id = ?`);
	const insertVenue = db?.prepare(`
		INSERT INTO venues (city_id, name, type, address, website, external_id, active)
		VALUES (?, ?, ?, ?, ?, ?, 1)
	`);

	let imported = 0, skipped = 0;

	for (const item of items) {
		const username = item.ownerUsername ?? item.username;
		const fullName = item.ownerFullName ?? item.fullName ?? username;
		if (!username) { skipped++; continue; }

		const caption = item.caption || '';
		const type = classify(`${fullName} ${caption} ${(item.hashtags || []).join(' ')}`);
		const { city, cc } = detectLocation(item);
		const extId = `ig:${username}`;

		if (findVenue?.get(extId)) { skipped++; continue; }

		if (!DRY_RUN) {
			const cityId = resolveCityId(db, city, cc);
			insertVenue.run(
				cityId,
				fullName || username,
				type,
				null,
				item.inputUrl ? `https://www.instagram.com/${username}/` : null,
				extId
			);
		}
		imported++;
	}

	if (db) db.close();
	console.log(`✅  Instagram: ${imported} venues importados, ${skipped} omitidos\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
