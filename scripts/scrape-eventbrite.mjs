/**
 * Eventbrite real-data scraper — NO API key needed
 * Scrapes public JSON-LD structured data from Eventbrite search pages
 */
import Database from 'better-sqlite3';

const DB_PATH = '/Users/jamileth/gendo_v2/gendo.db';
const DELAY_MS = 2000; // Polite delay between requests

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Build Eventbrite URL for a city
// Format: https://www.eventbrite.com/d/STATECODE--CITYNAME/events/
function buildEventbriteUrl(cityName, country, state, page = 1) {
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const prefix = state ? state.toLowerCase() : country.toLowerCase().replace(/\s+/g, '-').slice(0, 2);
  const base = `https://www.eventbrite.com/d/${prefix}--${citySlug}/events/`;
  return page > 1 ? `${base}?page=${page}` : base;
}

// Also try category-specific searches
function buildCategoryUrl(cityName, state, category, page = 1) {
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const prefix = (state || 'us').toLowerCase();
  const base = `https://www.eventbrite.com/d/${prefix}--${citySlug}/${category}--events/`;
  return page > 1 ? `${base}?page=${page}` : base;
}

async function fetchEventbritePage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    const html = await res.text();
    
    // Extract JSON-LD ItemList
    const m = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/);
    if (!m) return [];
    
    const d = JSON.parse(m[1]);
    const items = d.itemListElement ?? (d['@type'] === 'Event' ? [{ item: d }] : []);
    
    const events = [];
    for (const item of items) {
      const ev = item.item ?? item;
      if (ev['@type'] !== 'Event' || !ev.name) continue;
      
      const loc = ev.location ?? {};
      const addr = (typeof loc.address === 'object' ? loc.address : {});
      const offer = Array.isArray(ev.offers) ? ev.offers[0] : ev.offers;
      
      events.push({
        title: String(ev.name).trim(),
        description: ev.description ? String(ev.description).slice(0, 500) : null,
        dateStart: ev.startDate ?? null,
        dateEnd: ev.endDate ?? null,
        venueName: loc.name ?? null,
        venueAddress: typeof loc.address === 'string' 
          ? loc.address 
          : [addr.streetAddress, addr.addressLocality, addr.addressRegion].filter(Boolean).join(', '),
        cityName: addr.addressLocality ?? null,
        cityState: addr.addressRegion ?? null,
        price: offer?.price != null ? String(offer.price) : null,
        isFree: offer?.price === '0' || offer?.price === 0 || /free/i.test(String(offer?.availability ?? '')),
        url: ev.url ?? null,
        imageUrl: ev.image ?? (Array.isArray(ev.image) ? ev.image[0] : null) ?? null,
      });
    }
    return events;
  } catch (e) {
    console.log(`  → ${url.slice(0, 60)}: ${e.message}`);
    return [];
  }
}

function guessType(title) {
  const t = title.toLowerCase();
  if (/concert|music|band|live|tour|jazz|blues|country|rock|pop|dj |hip.hop|fest|sing|choir/i.test(t)) return 'live_music';
  if (/comedy|stand.?up|improv|funny/i.test(t)) return 'comedy';
  if (/broadway|musical|theater|theatre|opera|symphony|ballet|dance|perform/i.test(t)) return 'theater';
  if (/food|beer|wine|eat|drink|tast|market|farm|cook|culinary|chef|bake|brew/i.test(t)) return 'food';
  if (/art|exhibit|gallery|museum|photo|paint|sculpt|craft/i.test(t)) return 'art';
  if (/game|match|vs\.?|fight|race|sport|football|basketball|hockey|baseball|soccer|run|marathon|5k|triath/i.test(t)) return 'sports';
  if (/festival|fair|parade|celebrat|carnival|gala/i.test(t)) return 'festival';
  if (/film|movie|cinema|screen/i.test(t)) return 'cinema';
  if (/workshop|class|learn|train|seminar|webinar|conference|summit|forum/i.test(t)) return 'other';
  return 'other';
}

async function scrapeCity(db, city) {
  const { id: cityId, name, state, country } = city;
  console.log(`\n🌍 ${name}, ${state ?? country}`);
  
  let totalFound = 0, totalInserted = 0;
  const now = Math.floor(Date.now() / 1000);
  
  const checkDupe = db.prepare(`SELECT id FROM events WHERE external_id = ? LIMIT 1`);
  const insertEvt = db.prepare(`
    INSERT OR IGNORE INTO events 
      (title, description, date_start, date_end, type, price, price_amount, currency, source_url, image_url, source, venue_id, city_id, status, tags, featured, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, 'eventbrite', ?, ?, 'active', ?, 0, ?)
  `);

  // Try multiple URLs for this city
  const urls = [
    buildEventbriteUrl(name, country, state),
    buildEventbriteUrl(name, country, state, 2),
    buildEventbriteUrl(name, country, state, 3),
  ];
  
  // Also try categories for big cities
  if (city.event_count >= 5) {
    urls.push(buildCategoryUrl(name, state, 'music'));
    urls.push(buildCategoryUrl(name, state, 'food-and-drink'));
    urls.push(buildCategoryUrl(name, state, 'arts'));
    urls.push(buildCategoryUrl(name, state, 'sports-and-fitness'));
  }

  for (const url of urls) {
    process.stdout.write(`  Fetching ${url.slice(0, 65)}... `);
    const events = await fetchEventbritePage(url);
    process.stdout.write(`${events.length} events\n`);
    totalFound += events.length;
    
    if (events.length === 0) break; // No more pages
    
    for (const ev of events) {
      if (!ev.title || ev.title.length < 4) continue;
      
      // Parse date
      let dateStartTs = null;
      let dateEndTs = null;
      if (ev.dateStart) {
        const d = new Date(ev.dateStart);
        if (!isNaN(d.getTime())) {
          dateStartTs = Math.floor(d.getTime() / 1000);
          if (dateStartTs < now - 86400) continue; // Skip past events
        }
      }
      if (!dateStartTs) dateStartTs = now + 7 * 86400; // Default: 1 week from now
      if (ev.dateEnd) {
        const d = new Date(ev.dateEnd);
        if (!isNaN(d.getTime())) dateEndTs = Math.floor(d.getTime() / 1000);
      }
      
      const externalId = ev.url ?? null;
      if (externalId && checkDupe.get(externalId)) continue;
      
      const type = guessType(ev.title);
      const isFree = ev.isFree || ev.price === '0';
      const priceAmt = ev.price && !isFree && !isNaN(parseFloat(ev.price)) ? parseFloat(ev.price) : null;
      const price = isFree ? 'free' : (ev.price ? 'paid' : 'unknown');
      const tags = JSON.stringify(['eventbrite', type, name.toLowerCase().replace(/\s+/g,'-')]);
      
      try {
        insertEvt.run(
          ev.title, ev.description, dateStartTs, dateEndTs,
          type, price, priceAmt, ev.url, ev.imageUrl,
          null, cityId, tags, externalId
        );
        totalInserted++;
      } catch {}
    }
    
    await sleep(DELAY_MS);
  }
  
  console.log(`  ✅ ${totalInserted}/${totalFound} inserted`);
  return totalInserted;
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  const args = process.argv.slice(2);
  const targetCity = args[0]; // Optional: scrape only one city
  
  let cities;
  if (targetCity) {
    cities = db.prepare(`SELECT * FROM cities WHERE name LIKE ? LIMIT 1`).all(`%${targetCity}%`);
  } else {
    // Scrape all cities that have some events already
    cities = db.prepare(`
      SELECT c.*, COUNT(e.id) as event_count
      FROM cities c
      LEFT JOIN events e ON e.city_id = c.id
      GROUP BY c.id
      ORDER BY event_count DESC
    `).all();
  }
  
  console.log(`\n🚀 Eventbrite scraper — ${cities.length} cities to scrape`);
  console.log('📡 Source: Eventbrite public pages (no API key needed)\n');
  
  let totalNew = 0;
  for (const city of cities) {
    totalNew += await scrapeCity(db, city);
    await sleep(1000);
  }
  
  // Rebuild FTS5
  console.log('\n🔍 Rebuilding FTS5 index...');
  db.exec(`DELETE FROM events_fts;`);
  db.exec(`INSERT INTO events_fts(rowid, title, description, type, tags) SELECT id, title, COALESCE(description,''), type, COALESCE(tags,'') FROM events;`);
  
  const total = db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get();
  console.log(`\n✅ Done! +${totalNew} new events. Total in DB: ${total.n}`);
  
  // Show latest Cedar Rapids events
  const cr = db.prepare(`
    SELECT e.title, datetime(e.date_start,'unixepoch') as fecha, e.type
    FROM events e JOIN cities c ON c.id = e.city_id
    WHERE c.name = 'Cedar Rapids' AND e.source = 'eventbrite' AND e.status = 'active'
    ORDER BY e.date_start ASC LIMIT 15
  `).all();
  
  if (cr.length > 0) {
    console.log('\n🌽 New Cedar Rapids events from Eventbrite:');
    cr.forEach(e => console.log(`  ${e.fecha.slice(0,10)} [${e.type.padEnd(11)}] ${e.title.slice(0,55)}`));
  }
  
  db.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
