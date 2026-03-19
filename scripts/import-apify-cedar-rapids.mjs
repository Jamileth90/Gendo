/**
 * import-apify-cedar-rapids.mjs
 * Importa lugares de Cedar Rapids desde un JSON exportado por Apify
 * (actor: compass/crawler-google-places o similar).
 *
 * Uso:
 *   node scripts/import-apify-cedar-rapids.mjs
 *   node scripts/import-apify-cedar-rapids.mjs /ruta/al/archivo.json
 *
 * El JSON debe tener por registro al menos:
 *   title           → nombre del lugar
 *   address         → dirección completa  (o street + city + state)
 *   location.lat    → latitud
 *   location.lng    → longitud
 *   categoryName    → categoría principal (opcional)
 *   placeId         → ID de Google Maps (opcional, para deduplicar)
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../gendo.db');
const JSON_PATH = process.argv[2] ?? join(process.env.HOME, 'Downloads/lugares_nuevos.json');

// ── Categorías ───────────────────────────────────────────────────────────────

/**
 * Devuelve el tipo de venue.
 * Primero revisa palabras clave especiales (Pesca, Ciclismo),
 * luego aplica la lógica genérica del resto del proyecto.
 */
function guessVenueType(category, name = '') {
  const text = `${category ?? ''} ${name}`.toLowerCase();

  // Categorías especiales solicitadas
  if (/fish|pesc|angl|trout|bass|carp|salmon|walleye/i.test(text)) return 'pesca';
  if (/cycl|bicycl|bike|bicicl|ciclism|velodrom|mtb|biking/i.test(text)) return 'ciclismo';

  // Categorías genéricas
  if (/restaurant|food|burger|pizza|sushi|taco|diner|bistro|café|cafe|bar|pub|brewery|winery|nightclub|lounge/i.test(text)) return 'restaurant';
  if (/hotel|hostel|motel|inn|resort|lodge/i.test(text)) return 'hotel';
  if (/theater|theatre|cinema|movie|opera|ballet/i.test(text)) return 'theater';
  if (/museum|gallery|exhibit|art/i.test(text)) return 'museum';
  if (/park|beach|trail|nature|zoo|garden|forest|reserve/i.test(text)) return 'park';
  if (/stadium|arena|sport|gym|fitness|crossfit|yoga|pool|aquatic/i.test(text)) return 'sports';
  if (/club|disco|lounge|nightlife/i.test(text)) return 'nightclub';
  if (/shop|store|mall|market|boutique/i.test(text)) return 'shopping';
  return 'other';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae el placeId de una URL de Google Maps si no viene como campo directo. */
function extractPlaceId(rec) {
  if (rec.placeId) return rec.placeId;
  if (rec.url) {
    const m = rec.url.match(/query_place_id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

/** Construye la dirección completa desde los campos disponibles. */
function buildAddress(rec) {
  if (rec.address) return rec.address.trim() || null;
  const parts = [rec.street, rec.city, rec.state].filter(Boolean).map(s => s.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // 1. Leer JSON
  let raw;
  try {
    raw = readFileSync(JSON_PATH, 'utf8');
  } catch {
    console.error(`❌ No se encontró el archivo: ${JSON_PATH}`);
    console.error('   Pasa la ruta como argumento: node scripts/import-apify-cedar-rapids.mjs /ruta/archivo.json');
    process.exit(1);
  }

  const parsed  = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : [parsed];
  console.log(`\n📂 Archivo: ${JSON_PATH}`);
  console.log(`📋 Registros encontrados: ${records.length}\n`);

  // 2. Abrir DB
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 3. Obtener city_id de Cedar Rapids
  const cityRow = db.prepare(`SELECT id FROM cities WHERE name LIKE '%Cedar Rapids%' LIMIT 1`).get();
  if (!cityRow) {
    console.error('❌ Cedar Rapids no está en la tabla cities. Añádela primero.');
    process.exit(1);
  }
  const cityId = cityRow.id;
  console.log(`🏙  Cedar Rapids → city_id: ${cityId}\n`);

  // 4. Prepared statements
  const findByExternalId = db.prepare(`SELECT id FROM venues WHERE external_id = ? LIMIT 1`);
  const findByName       = db.prepare(`SELECT id FROM venues WHERE name = ? AND city_id = ? LIMIT 1`);

  // INSERT OR IGNORE garantiza que si el external_id ya existe (índice UNIQUE), se omite sin error.
  const insertVenue = db.prepare(`
    INSERT OR IGNORE INTO venues
      (city_id, name, type, address, lat, lng, website, phone, active, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  // 5. Procesar registros
  let inserted = 0, skipped = 0, errors = 0;

  for (const rec of records) {
    const name       = (rec.title ?? '').trim();
    const address    = buildAddress(rec);
    const lat        = rec.location?.lat ?? rec.lat ?? null;
    const lng        = rec.location?.lng ?? rec.lng ?? null;
    const website    = (rec.website ?? '').trim() || null;
    const phone      = (rec.phone   ?? '').trim() || null;
    const cat        = rec.categoryName ?? (Array.isArray(rec.categories) ? rec.categories[0] : null);
    const externalId = extractPlaceId(rec);
    const type       = guessVenueType(cat, name);

    // Validar mínimo: necesitamos nombre
    if (!name) { skipped++; continue; }

    // Deduplicación: por external_id primero, luego por nombre+ciudad
    if (externalId && findByExternalId.get(externalId)) {
      console.log(`  ⏭  Ya existe (external_id): "${name}"`);
      skipped++;
      continue;
    }
    if (!externalId && findByName.get(name, cityId)) {
      console.log(`  ⏭  Ya existe (nombre):      "${name}"`);
      skipped++;
      continue;
    }

    try {
      const result = insertVenue.run(cityId, name, type, address, lat, lng, website, phone, externalId);
      if (result.changes === 0) {
        // INSERT OR IGNORE lo omitió (race condition con el índice UNIQUE)
        console.log(`  ⏭  Omitido por UNIQUE:      "${name}"`);
        skipped++;
      } else {
        const latStr = lat != null ? lat.toFixed(5) : 'sin lat';
        const lngStr = lng != null ? lng.toFixed(5) : 'sin lng';
        console.log(`  ✅ [${type.padEnd(10)}] ${name.slice(0, 45).padEnd(45)}  ${latStr}, ${lngStr}`);
        inserted++;
      }
    } catch (e) {
      console.error(`  ❌ Error: "${name}" → ${e.message}`);
      errors++;
    }
  }

  // 6. Resumen
  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Insertados:  ${inserted}`);
  console.log(`⏭  Omitidos:   ${skipped}`);
  if (errors > 0) console.log(`❌ Errores:    ${errors}`);
  console.log(`📊 Total venues Cedar Rapids: ${
    db.prepare('SELECT COUNT(*) as n FROM venues WHERE city_id = ?').get(cityId).n
  }`);

  db.close();
}

main();
