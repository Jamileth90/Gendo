/**
 * import-apify-social.mjs  — v2 Global + Bilingüe
 *
 * Conecta con tu cuenta de Apify, descarga resultados de scrapers de
 * Facebook e Instagram, clasifica en ES+EN y guarda en gendo.db.
 *
 * Categorías (bilingüe):
 *   🔵 agua    → Pesca / Playas / Beach / Fishing  (type: 'pesca')
 *   🟢 verde   → Parques / Bici / Outdoor / Trail  (type: 'ciclismo')
 *   🟣 zen     → Yoga / Bienestar / Wellness        (type: 'yoga')
 *   🟠 social  → Eventos / Bares / Social / Party   (type: 'social')
 *
 * Uso:
 *   node scripts/import-apify-social.mjs [--dry-run] [--dataset=ID] [--limit=200]
 *
 * Requiere en .env:   APIFY_TOKEN=tu_token
 */

import Database      from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';
import { readFileSync, existsSync } from 'fs';

// ── Cargar .env ───────────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
if (existsSync(envPath)) {
	readFileSync(envPath, 'utf8').split('\n')
		.filter(l => l.trim() && !l.startsWith('#'))
		.forEach(l => {
			const [k, ...v] = l.split('=');
			if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
		});
}

const TOKEN   = process.env.APIFY_TOKEN;
const DB_PATH = process.env.DATABASE_URL ?? resolve(__dir, '../gendo.db');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT   = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '300', 10);
const DS_ARG  = process.argv.find(a => a.startsWith('--dataset='))?.split('=')[1];

if (!TOKEN || TOKEN === 'PEGA_AQUI_TU_NUEVO_TOKEN') {
	console.error('❌  Falta APIFY_TOKEN en .env\n   Ve a https://console.apify.com/account/integrations');
	process.exit(1);
}

const APIFY_BASE = 'https://api.apify.com/v2';

// ── Clasificador bilingüe ES + EN ─────────────────────────────────────────────
// Retorna el tipo para la BD ('pesca'|'ciclismo'|'yoga'|'social') o null
const CLASSIFIERS = [
	{
		type: 'pesca',
		re: /\b(
			pesca|pescando|pescar|pescador|pez|peces|playa|playas|surf\b|surfing|
			buceo|snorkel|kayak\b|canoa|remo|velero|bote\b|lancha|muelle|
			atún|mariscos|langosta|camarón|
			fish\b|fishing|fisherman|angler|bass\b|trout|walleye|crappie|catfish|
			beach|beaches|surf\b|surfing|surfer|wave|waves|
			kayak\b|kayaking|canoe|rowing|sailing|boat\b|
			snorkeling|diving|scuba|paddle\b|paddleboard|waterfront|lakeside
		)\b/xi,
	},
	{
		type: 'yoga',
		re: /\b(
			yoga\b|yogui|pilates|mindfulness|meditaci[oó]n|meditar|
			bienestar|holístico|holistico|espiritual|chakra|reiki|
			terapia\b|sanaci[oó]n|spa\b|masaje|relajaci[oó]n|
			tai.?chi|qigong|pranayama|namaste|retiro\b|
			wellness\b|wellbeing|holistic|healing|therapy\b|
			meditation\b|meditate|mindful|pilates\b|
			yoga.?studio|yoga.?class|hot.?yoga|vinyasa|hatha|yin\b
		)\b/xi,
	},
	{
		type: 'ciclismo',
		re: /\b(
			bici\b|bicicleta|ciclismo|ciclista|ciclov[íi]a|cicloruta|
			parque\b|parques|bosque|sendero|senderismo|caminata|trekking|
			montaña|escalada|camping|naturaleza|aire.?libre|
			correr|running|maratón|
			bike\b|biking|bicycle|cycling|cyclist|trail\b|trails|
			hike\b|hiking|trekking|camping|mountain|climbing|
			outdoor\b|outdoors|nature\b|run\b|running|marathon|
			skate\b|skateboard|greenway|bikeway|park\b|parks
		)\b/xi,
	},
	{
		type: 'social',
		re: /\b(
			fiesta\b|fiestas|carnaval|concierto|conciertos|
			bar\b|bares|cantina\b|pub\b|discoteca|club\b|
			cerveza|cocktail|cóctel|trago\b|mezcal|tequila\b|
			karaoke|dj\b|baile\b|bailar|salsa\b|cumbia|reggaeton|
			evento\b|eventos|celebraci[oó]n|mercado\b|feria\b|festival\b|
			party\b|parties|concert\b|band\b|show\b|shows|
			nightlife|nightclub|dance\b|dancing|
			bar\b|bars|pub\b|brewery\b|winery\b|
			comedy\b|standup|happy.?hour|social\b|gathering\b
		)\b/xi,
	},
];

function classifyText(...texts) {
	const combined = texts.filter(Boolean).join(' ')
		.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	for (const { type, re } of CLASSIFIERS) {
		if (re.test(combined)) return type;
	}
	return null;
}

// ── Detectar país desde texto ─────────────────────────────────────────────────
const COUNTRY_CODES = {
	'ecuador': 'EC', 'colombia': 'CO', 'peru': 'PE', 'perú': 'PE',
	'chile': 'CL', 'mexico': 'MX', 'méxico': 'MX', 'argentina': 'AR',
	'venezuela': 'VE', 'bolivia': 'BO', 'paraguay': 'PY', 'uruguay': 'UY',
	'costa rica': 'CR', 'panama': 'PA', 'panamá': 'PA', 'nicaragua': 'NI',
	'guatemala': 'GT', 'honduras': 'HN', 'el salvador': 'SV', 'cuba': 'CU',
	'united states': 'US', 'usa': 'US', 'us': 'US', 'canada': 'CA',
	'spain': 'ES', 'españa': 'ES', 'france': 'FR', 'germany': 'DE',
	'brazil': 'BR', 'brasil': 'BR', 'uk': 'GB', 'australia': 'AU',
};

function detectCountryCode(text = '') {
	const t = text.toLowerCase();
	for (const [name, code] of Object.entries(COUNTRY_CODES)) {
		if (t.includes(name)) return code;
	}
	return 'US'; // fallback
}

// ── Apify helpers ─────────────────────────────────────────────────────────────
async function apifyGet(path) {
	const sep = path.includes('?') ? '&' : '?';
	const res = await fetch(`${APIFY_BASE}${path}${sep}token=${TOKEN}`);
	if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text().catch(() => '')}`);
	return res.json();
}

async function getLatestDatasetId(actorId) {
	const data = await apifyGet(`/acts/${actorId}/runs?limit=1&desc=1`);
	return data.data?.items?.[0]?.defaultDatasetId ?? null;
}

async function fetchDatasetItems(datasetId) {
	const data = await apifyGet(`/datasets/${datasetId}/items?limit=${LIMIT}&clean=true`);
	return Array.isArray(data) ? data : (data.data?.items ?? data.items ?? []);
}

// ── Normalizar items de diferentes fuentes ────────────────────────────────────
function normalizeItem(item) {
	// ── Facebook Events ───────────────────────────────────────────────────────
	if (item.utcStartDate || item['location.name']) {
		const name        = item.name ?? item.title;
		const locationRaw = item['location.name'] ?? item.location?.name ?? '';
		const cityRaw     = item['location.city'] ?? item.location?.city ?? locationRaw;
		const cityName    = cityRaw.split(',')[0].trim() || null;
		const countryCode = detectCountryCode(cityRaw);
		const dateTs      = item.utcStartDate
			? Math.floor(new Date(item.utcStartDate).getTime() / 1000)
			: null;
		const type = classifyText(name, item.description, item.organizedBy);

		if (!name || !cityName || !dateTs) return null;
		return {
			kind: 'event',
			name, type: type ?? 'social', cityName, countryCode,
			address: locationRaw || null,
			lat: item.location?.lat ?? null,
			lng: item.location?.lng ?? null,
			dateTs, imageUrl: item.imageUrl ?? null,
			externalId: item.url ?? null,
		};
	}

	// ── Instagram Posts ───────────────────────────────────────────────────────
	if (item.username || item.ownerUsername || item.biography) {
		const username  = item.ownerUsername ?? item.username;
		const fullName  = item.ownerFullName ?? item.fullName ?? username;
		const bio       = item.biography ?? item.bio ?? '';
		const caption   = item.caption ?? '';
		const hashtags  = (item.hashtags ?? []).join(' ');
		const locName   = item.locationName ?? '';
		const cityName  = locName.split(',')[0].trim() || null;
		const type      = classifyText(fullName, bio, caption, hashtags, locName);

		if (!username || !type) return null;
		return {
			kind: 'venue',
			name: fullName || username, type,
			cityName: cityName || 'Unknown',
			countryCode: detectCountryCode(locName + ' ' + bio),
			address: locName || null,
			lat: null, lng: null,
			website: item.externalUrl ?? null,
			externalId: `ig:${username}`,
		};
	}

	// ── Google Maps / Apify Places ────────────────────────────────────────────
	if (item.title && (item.location || item.lat)) {
		const name  = item.title;
		const lat   = item.location?.lat ?? item.lat ?? null;
		const lng   = item.location?.lng ?? item.lng ?? null;
		const addr  = item.address ?? [item.street, item.city, item.state].filter(Boolean).join(', ');
		const type  = classifyText(name, item.categoryName, item.categories?.join(' '), item.description);
		const city  = item.city ?? addr.split(',')[0].trim();
		const cc    = detectCountryCode(item.countryCode ?? item.country ?? addr);

		if (!name || !type) return null;
		return {
			kind: 'venue',
			name, type, cityName: city, countryCode: cc,
			address: addr || null, lat, lng,
			website: item.website ?? null, phone: item.phone ?? null,
			externalId: item.placeId ?? item.url ?? null,
		};
	}

	return null;
}

// ── BD helpers ────────────────────────────────────────────────────────────────
const cityCache = new Map();
function resolveCityId(db, cityName, countryCode) {
	const key = `${cityName}|${countryCode}`.toLowerCase();
	if (cityCache.has(key)) return cityCache.get(key);

	const existing = db.prepare(
		`SELECT id FROM cities WHERE lower(name) = lower(?) AND country_code = ?`
	).get(cityName, countryCode) ??
	db.prepare(`SELECT id FROM cities WHERE lower(name) = lower(?)`).get(cityName);

	if (existing) { cityCache.set(key, existing.id); return existing.id; }

	const res = db.prepare(
		`INSERT INTO cities (name, country, country_code) VALUES (?, ?, ?)`
	).run(cityName,
		Object.entries(COUNTRY_CODES).find(([,c]) => c === countryCode)?.[0] ?? countryCode,
		countryCode
	);
	const id = Number(res.lastInsertRowid);
	cityCache.set(key, id);
	console.log(`   🌆 Ciudad nueva: ${cityName} (${countryCode}) id=${id}`);
	return id;
}

function importItems(db, items) {
	const findVenueExt  = db.prepare(`SELECT id FROM venues WHERE external_id = ?`);
	const findVenueName = db.prepare(`SELECT id FROM venues WHERE city_id = ? AND lower(name) = lower(?)`);
	const insertVenue   = db.prepare(`
		INSERT INTO venues (city_id, name, type, address, lat, lng, website, external_id, active)
		VALUES (@city_id, @name, @type, @address, @lat, @lng, @website, @external_id, 1)
	`);
	const updateVenue   = db.prepare(`
		UPDATE venues SET type=@type, address=COALESCE(@address,address),
		lat=COALESCE(@lat,lat), lng=COALESCE(@lng,lng), updated_at=strftime('%s','now')
		WHERE id=@id
	`);
	const checkEvent    = db.prepare(`SELECT id FROM events WHERE external_id = ?`);
	const insertEvent   = db.prepare(`
		INSERT INTO events (venue_id, city_id, title, date_start, type, image_url,
		                    source_url, source, status, price, tags, external_id)
		VALUES (@venue_id, @city_id, @title, @date_start, @type, @image_url,
		        @source_url, 'facebook', 'active', 'free', '[]', @external_id)
	`);

	const c = { venues: 0, events: 0, dupes: 0, skipped: 0 };

	db.transaction(() => {
		for (const item of items) {
			if (!item) { c.skipped++; continue; }
			const cityId = resolveCityId(db, item.cityName, item.countryCode);

			if (item.kind === 'venue') {
				if (item.externalId && findVenueExt.get(item.externalId)) { c.dupes++; continue; }
				const ev = findVenueName.get(cityId, item.name);
				if (ev) { updateVenue.run({ id: ev.id, type: item.type, address: item.address, lat: item.lat, lng: item.lng }); }
				else    { insertVenue.run({ city_id: cityId, name: item.name, type: item.type, address: item.address, lat: item.lat, lng: item.lng, website: item.website ?? null, external_id: item.externalId ?? null }); c.venues++; }
			} else {
				if (item.externalId && checkEvent.get(item.externalId)) { c.dupes++; continue; }
				insertEvent.run({ venue_id: null, city_id: cityId, title: item.name, date_start: item.dateTs, type: item.type, image_url: item.imageUrl ?? null, source_url: item.externalId, external_id: item.externalId });
				c.events++;
			}
		}
	})();
	return c;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
	console.log(`\n🌍  Gendo × Apify Social Importer  v2 Global+Bilingüe`);
	console.log(`   Límite: ${LIMIT} items${DRY_RUN ? '  [DRY-RUN]' : ''}\n`);

	let allItems = [];

	try {
		if (DS_ARG) {
			console.log(`📦  Dataset especificado: ${DS_ARG}`);
			allItems = await fetchDatasetItems(DS_ARG);
		} else {
			// Descubrir actores de redes sociales
			const data   = await apifyGet('/acts?my=true&limit=100');
			const actors = (data.data?.items ?? []).filter(a =>
				/facebook|instagram|fb|ig|social/i.test(`${a.name} ${a.description ?? ''}`)
			);

			if (actors.length > 0) {
				console.log(`🔍  Actores encontrados: ${actors.map(a => a.name).join(', ')}`);
				for (const actor of actors) {
					const dsId = await getLatestDatasetId(actor.id);
					if (!dsId) continue;
					const items = await fetchDatasetItems(dsId);
					console.log(`   📡 ${actor.name}: ${items.length} items`);
					allItems.push(...items);
				}
			} else {
				// Fallback: 2 datasets más recientes
				const datasets = await apifyGet('/datasets?my=true&limit=10&desc=1');
				const list = datasets.data?.items ?? [];
				if (list.length === 0) { console.error('❌  Sin datasets en tu cuenta.'); process.exit(1); }
				console.log('📋  Usando los datasets más recientes:');
				for (const ds of list.slice(0, 2)) {
					const items = await fetchDatasetItems(ds.id);
					console.log(`   [${ds.name ?? ds.id}] ${items.length} items`);
					allItems.push(...items);
				}
			}
		}
	} catch (e) {
		console.error('❌  Error Apify:', e.message); process.exit(1);
	}

	if (allItems.length === 0) { console.log('⚠️  Sin items.'); return; }

	// Clasificar
	const normalized = allItems.map(normalizeItem).filter(Boolean);
	const byType = { pesca: 0, ciclismo: 0, yoga: 0, social: 0, other: allItems.length - normalized.length };
	normalized.forEach(i => { byType[i.type] = (byType[i.type] ?? 0) + 1; });

	const icons = { pesca:'🔵', ciclismo:'🟢', yoga:'🟣', social:'🟠' };
	console.log(`\n🏷️  Clasificados (${normalized.length}/${allItems.length}):`);
	console.log(`   🔵 Agua/Pesca    : ${byType.pesca}`);
	console.log(`   🟢 Parques/Bici  : ${byType.ciclismo}`);
	console.log(`   🟣 Yoga/Bienestar: ${byType.yoga}`);
	console.log(`   🟠 Social/Eventos: ${byType.social}`);
	console.log(`   ⚪ Sin categoría  : ${byType.other}`);

	console.log('\n📋  Preview (primeros 15):');
	normalized.slice(0, 15).forEach(v =>
		console.log(`   ${icons[v.type] ?? '⚪'} [${v.type.padEnd(8)}] ${v.name.slice(0,40)} — ${v.cityName} (${v.countryCode})`)
	);

	if (DRY_RUN) { console.log('\nℹ️  Ejecuta sin --dry-run para guardar.\n'); return; }

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	const c = importItems(db, normalized);
	db.close();

	console.log(`\n✅  Listo:`);
	console.log(`   Venues insertas : ${c.venues}`);
	console.log(`   Eventos insertas: ${c.events}`);
	console.log(`   Duplicados      : ${c.dupes}`);
	console.log(`\n🌐  Abre la app y verás los pines en el mapa.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
