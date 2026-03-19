/**
 * import-lugares.mjs
 * Lee lugares_nuevos.json (exportado desde Apify) e importa los venues
 * a la base de datos de Gendo.
 *
 * Uso:
 *   node scripts/import-lugares.mjs
 *   node scripts/import-lugares.mjs /ruta/al/archivo.json
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../gendo.db');
const JSON_PATH = process.argv[2] ?? join(process.env.HOME, 'Downloads/lugares_nuevos.json');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte categoryName de Google Maps en el tipo de venue que usa Gendo */
function guessVenueType(category) {
  if (!category) return 'other';
  const c = category.toLowerCase();
  if (/restaurant|food|burger|pizza|sushi|taco|diner|bistro|café|cafe|bar|pub|brewery|winery|nightclub|lounge/i.test(c)) return 'restaurant';
  if (/hotel|hostel|motel|inn|resort|airbnb|lodg/i.test(c)) return 'hotel';
  if (/theater|theatre|cinema|movie|opera|ballet/i.test(c)) return 'theater';
  if (/museum|gallery|exhibit|art/i.test(c)) return 'museum';
  if (/park|beach|trail|nature|zoo|garden/i.test(c)) return 'park';
  if (/stadium|arena|sport|gym|fitness|crossfit|yoga/i.test(c)) return 'sports';
  if (/club|disco|lounge|nightlife/i.test(c)) return 'nightclub';
  if (/shop|store|mall|market|boutique/i.test(c)) return 'shopping';
  if (/school|university|college|church|temple|mosque/i.test(c)) return 'other';
  return 'other';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // 1. Leer el JSON
  let raw;
  try {
    raw = readFileSync(JSON_PATH, 'utf8');
  } catch {
    console.error(`❌ No se encontró el archivo: ${JSON_PATH}`);
    console.error('   Asegúrate de que el archivo esté en ~/Downloads/lugares_nuevos.json');
    console.error('   o pasa la ruta como argumento: node scripts/import-lugares.mjs /ruta/archivo.json');
    process.exit(1);
  }

  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : [parsed];
  console.log(`\n📂 Archivo: ${JSON_PATH}`);
  console.log(`📋 Registros encontrados: ${records.length}\n`);

  // 2. Abrir DB
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // 3. Prepared statements
  const findCity = db.prepare(`
    SELECT id FROM cities
    WHERE name = ? AND (state = ? OR (state IS NULL AND ? IS NULL))
    LIMIT 1
  `);

  const insertCity = db.prepare(`
    INSERT INTO cities (name, country, country_code, state)
    VALUES (?, ?, ?, ?)
  `);

  const findVenue = db.prepare(`
    SELECT id FROM venues WHERE external_id = ? LIMIT 1
  `);

  const findVenueByName = db.prepare(`
    SELECT id FROM venues WHERE name = ? LIMIT 1
  `);

  const insertVenue = db.prepare(`
    INSERT INTO venues (city_id, name, type, address, lat, lng, website, phone, active, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  // 4. Procesar registros
  let inserted = 0, skipped = 0, errors = 0;

  for (const rec of records) {
    const name       = (rec.title ?? '').trim();
    const street     = (rec.street  ?? '').trim();
    const city       = (rec.city    ?? '').trim();
    const state      = (rec.state   ?? '').trim() || null;
    const country    = rec.countryCode === 'US' ? 'United States' : (rec.countryCode ?? 'Unknown');
    const code       = (rec.countryCode ?? 'XX').toUpperCase();
    const website    = (rec.website ?? '').trim() || null;
    const phone      = (rec.phone   ?? '').trim() || null;
    const cat        = rec.categoryName ?? (Array.isArray(rec.categories) ? rec.categories[0] : null);
    const externalId = (rec.placeId ?? rec.id ?? '').trim() || null;
    const lat        = rec.location?.lat ?? rec.lat ?? null;
    const lng        = rec.location?.lng ?? rec.lng ?? null;

    // Validar mínimo: necesitamos nombre
    if (!name) { skipped++; continue; }

    // Dirección completa
    const addressParts = [street, city, state].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : null;

    // ¿Ya existe por external_id o por nombre?
    if (externalId && findVenue.get(externalId)) {
      console.log(`  ⏭  Duplicado (external_id), omitido: "${name}"`);
      skipped++;
      continue;
    }
    if (!externalId && findVenueByName.get(name)) {
      console.log(`  ⏭  Duplicado (nombre), omitido: "${name}"`);
      skipped++;
      continue;
    }

    // Buscar o crear la ciudad
    let cityId = null;
    if (city) {
      let cityRow = findCity.get(city, state, state);
      if (!cityRow) {
        try {
          const r = insertCity.run(city, country, code, state);
          cityId = r.lastInsertRowid;
          console.log(`  🏙  Nueva ciudad creada: ${city}${state ? ', ' + state : ''}`);
        } catch {
          cityId = null;
        }
      } else {
        cityId = cityRow.id;
      }
    }

    // Insertar el venue
    try {
      insertVenue.run(cityId, name, guessVenueType(cat), address, lat, lng, website, phone, externalId);
      console.log(`  ✅ ${name.slice(0, 50)}${name.length > 50 ? '…' : ''}`);
      inserted++;
    } catch (e) {
      console.error(`  ❌ Error insertando "${name}": ${e.message}`);
      errors++;
    }
  }

  // 5. Resumen
  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Insertados:  ${inserted}`);
  console.log(`⏭  Duplicados: ${skipped}`);
  if (errors > 0) console.log(`❌ Errores:    ${errors}`);
  console.log(`📊 Total venues en DB: ${db.prepare('SELECT COUNT(*) as n FROM venues').get().n}`);

  db.close();
}

main();
