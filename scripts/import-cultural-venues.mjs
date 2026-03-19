/**
 * import-cultural-venues.mjs
 *
 * Importa lugares culturales y gastronómicos desde un JSON de Apify.
 * Clasifica cada venue como 'cultura' o 'gastronomia'.
 * Usa external_id (placeId de Google Maps) para evitar duplicados.
 *
 * Uso:
 *   node scripts/import-cultural-venues.mjs <archivo.json> [--city-id=61] [--dry-run]
 *
 * Ejemplo:
 *   node scripts/import-cultural-venues.mjs Downloads/lugares_nuevos.json --city-id=61
 */

import Database  from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const CITY_ID  = parseCityId() ?? 61;          // Cedar Rapids por defecto
const DB_PATH  = './gendo.db';
const DRY_RUN  = process.argv.includes('--dry-run');
const FILE_ARG = process.argv.find(a => a.endsWith('.json'));

if (!FILE_ARG) {
  console.error('❌  Uso: node scripts/import-cultural-venues.mjs <archivo.json> [--city-id=XX] [--dry-run]');
  process.exit(1);
}

// ── Clasificador de venues ────────────────────────────────────────────────────
/**
 * Devuelve 'cultura', 'gastronomia' u 'other' según el nombre
 * y la categoría de Google Maps.
 */
function classifyVenue(categoryName = '', name = '') {
  const text = `${categoryName} ${name}`.toLowerCase();

  // ── Gastronomía  ──────────────────────────────────────────────────────────
  const GASTRO_RE = /restaurant|bistro|brasserie|trattoria|ristorante|cantina|taqueria|taquer[ií]a|food|comida|cuisine|eatery|dining|diner|deli|delicatessen|caf[eé]|cafeteria|coffee|tea house|teahouse|bakery|panader[ií]a|pasteler[ií]a|patisserie|confectioner|pub|brewery|cervecer[ií]a|winery|bodega|distillery|food hall|food market|farmer|produce|grocery|sushi|ramen|pho|noodle|pizza|burger|taco|burrito|wrap|grill|barbecue|bbq|steakhouse|seafood|mariscos|ceviche|kitchen|cocina|chef|gastronom|culinar/i;
  if (GASTRO_RE.test(text)) return 'gastronomia';

  // ── Cultura  ──────────────────────────────────────────────────────────────
  const CULTURA_RE = /museum|museo|galler[yí]|galleria|theater|theatre|teatro|opera|ballet|dance|cinema|cine|movie|film|screening|artisan|craft|artesan|cultural|heritage|patrimonio|historic|histor|library|biblioteca|archive|archivo|concert hall|auditori|philharmonic|symphony|exhibit|exposition|installation|festival|fair|feria|carnival|carnaval|performance|performing|creative|studio|taller|workshop|science center|planetarium|aquarium|zoo|botanical/i;
  if (CULTURA_RE.test(text)) return 'cultura';

  // Detecta "art" sólo como palabra completa para evitar falsos positivos (depart…)
  if (/\bart\b|\barte\b|\bartist\b/i.test(text)) return 'cultura';

  // ── Heurística secundaria para "market" ambiguo ───────────────────────────
  if (/market|mercado/i.test(text)) {
    return /art|craft|design|vintage|flea|antique/i.test(text)
      ? 'cultura'
      : 'gastronomia';
  }

  return 'other';
}

// ── Extrae el placeId de la URL de Google Maps ────────────────────────────────
function extractPlaceId(rec) {
  if (rec.placeId) return rec.placeId;
  if (rec.id)      return rec.id;
  if (rec.url) {
    const m = rec.url.match(/query_place_id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

// ── Construye dirección normalizada ──────────────────────────────────────────
function buildAddress(rec) {
  if (rec.address) return rec.address;
  const parts = [rec.street, rec.city, rec.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

// ── Parsea --city-id=XX ───────────────────────────────────────────────────────
function parseCityId() {
  const arg = process.argv.find(a => a.startsWith('--city-id='));
  return arg ? parseInt(arg.split('=')[1], 10) : null;
}

// ── Función principal ─────────────────────────────────────────────────────────
function main() {
  const filePath = resolve(process.cwd(), FILE_ARG);
  let raw;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌  No se pudo leer ${filePath}:`, err.message);
    process.exit(1);
  }

  const records = Array.isArray(raw) ? raw : [raw];
  console.log(`📂  Archivo: ${filePath}`);
  console.log(`📍  Ciudad ID: ${CITY_ID}${DRY_RUN ? '  [DRY-RUN]' : ''}`);
  console.log(`📊  Registros encontrados: ${records.length}`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const findByExtId = db.prepare(`
    SELECT id FROM venues WHERE external_id = ?
  `);
  const findByName = db.prepare(`
    SELECT id FROM venues WHERE city_id = ? AND lower(name) = lower(?)
  `);
  const insertVenue = db.prepare(`
    INSERT INTO venues (city_id, name, type, address, lat, lng,
                        website, phone, external_id, active, verified)
    VALUES (@city_id, @name, @type, @address, @lat, @lng,
            @website, @phone, @external_id, 1, 0)
  `);
  const updateVenue = db.prepare(`
    UPDATE venues
    SET type = @type, address = COALESCE(@address, address),
        lat  = COALESCE(@lat, lat), lng = COALESCE(@lng, lng),
        website = COALESCE(@website, website), phone = COALESCE(@phone, phone),
        external_id = COALESCE(@external_id, external_id),
        updated_at = strftime('%s', 'now')
    WHERE id = @id
  `);

  const counters = { inserted: 0, updated: 0, skipped: 0, other: 0 };
  const preview  = [];

  const runImport = db.transaction(() => {
    for (const rec of records) {
      const name       = rec.title ?? rec.name;
      const categoryName = rec.categoryName ?? rec.categories?.[0] ?? '';
      const address    = buildAddress(rec);
      const lat        = rec.location?.lat  ?? rec.lat  ?? null;
      const lng        = rec.location?.lng  ?? rec.lng  ?? null;
      const website    = rec.website ?? null;
      const phone      = rec.phone   ?? null;
      const externalId = extractPlaceId(rec);

      if (!name) { counters.skipped++; continue; }

      const venueType = classifyVenue(categoryName, name);
      if (venueType === 'other') { counters.other++; continue; }

      preview.push({ name, type: venueType, category: categoryName });

      if (DRY_RUN) { counters.inserted++; continue; }

      // ── Buscar existente ──────────────────────────────────────────────────
      let existing = externalId ? findByExtId.get(externalId) : null;
      if (!existing) existing = findByName.get(CITY_ID, name);

      if (existing) {
        updateVenue.run({ id: existing.id, type: venueType, address, lat, lng,
                          website, phone, external_id: externalId ?? null });
        counters.updated++;
      } else {
        insertVenue.run({ city_id: CITY_ID, name, type: venueType, address,
                          lat, lng, website, phone, external_id: externalId ?? null });
        counters.inserted++;
      }
    }
  });

  runImport();

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n✅  Importación completada:');
  console.log(`   🏛️  Cultura      : ${preview.filter(p => p.type === 'cultura').length}`);
  console.log(`   🍽️  Gastronomía  : ${preview.filter(p => p.type === 'gastronomia').length}`);
  console.log(`   ⚠️  Otros (skip) : ${counters.other}`);
  console.log(`   ❌  Sin nombre   : ${counters.skipped}`);
  if (!DRY_RUN) {
    console.log(`\n   💾  Insertados: ${counters.inserted}`);
    console.log(`   🔄  Actualizados: ${counters.updated}`);
  }

  if (DRY_RUN) {
    console.log('\n📋  Preview (primeros 20):');
    preview.slice(0, 20).forEach(p =>
      console.log(`   ${p.type === 'cultura' ? '🏛️ ' : '🍽️ '} [${p.type.padEnd(12)}] ${p.name} (${p.category})`)
    );
    console.log('\nℹ️  Ejecuta sin --dry-run para importar de verdad.');
  }

  db.close();
}

main();
