/**
 * Live scraper — Cedar Rapids, Iowa
 * Node.js puro (fetch + JSON-LD parsing), sin navegador
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DATABASE_URL ?? join(process.cwd(), 'gendo.db');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchPage(url) {
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!r.ok) { console.log(`  → HTTP ${r.status} for ${url}`); return null; }
    return await r.text();
  } catch(e) {
    console.log(`  → Error: ${e.message}`);
    return null;
  }
}

function extractJsonLd(html) {
  const events = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      const arr = Array.isArray(d) ? d : (d['@graph'] ?? [d]);
      for (const item of arr) {
        if (item['@type'] === 'Event' && item.name) {
          const loc = item.location;
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          events.push({
            title: String(item.name).trim(),
            description: item.description ? String(item.description).slice(0, 300) : null,
            date: item.startDate ?? null,
            venue: loc?.name ?? null,
            url: item.url ?? null,
            price: offer?.price ? String(offer.price) : (offer?.priceCurrency ? '0' : null),
            isFree: offer?.price === '0' || offer?.price === 0 || /free/i.test(String(offer?.priceCurrency ?? ''))
          });
        }
      }
    } catch {}
  }
  return events;
}

function parseTs(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  return null;
}

function guessType(title) {
  const t = title.toLowerCase();
  if (/st\.?\s*pat(rick)?|irish|shamrock|green beer|bar crawl/i.test(t)) return 'festival';
  if (/brew(ery|pub)|craft beer|taproom|beer fest/i.test(t)) return 'food';
  if (/concert|music|band|live|tour|jazz|blues|country|rock|pop|dj /i.test(t)) return 'live_music';
  if (/comedy|stand.?up|improv/i.test(t)) return 'comedy';
  if (/broadway|musical|theater|theatre|opera|symphony|ballet/i.test(t)) return 'theater';
  if (/food|beer|wine|market|tast/i.test(t)) return 'food';
  if (/art|exhibit|gallery/i.test(t)) return 'art';
  if (/game|match|vs\.?|hockey|baseball|basketball|football|soccer/i.test(t)) return 'sports';
  if (/festival|fair|parade/i.test(t)) return 'festival';
  return 'other';
}

const SOURCES = [
  // Cedar Rapids Tourism — has JSON-LD events
  { url: 'https://www.cedar-rapids.com/events', source: 'cedar_rapids_tourism', venue: null },
  // Tourism Cedar Rapids (St. Patrick's, breweries, festivals)
  { url: 'https://www.tourismcedarrapids.com/events-calendar/', source: 'tourism_cr', venue: null },
  // Brucemore — had JSON-LD in our earlier test
  { url: 'https://brucemore.org/events/', source: 'brucemore', venue: 'Brucemore Mansion' },
  // Alliant Energy PowerHouse
  { url: 'https://alliantenergypowerhouse.com/events/', source: 'powerhouse', venue: 'Alliant Energy PowerHouse' },
  { url: 'https://alliantenergypowerhouse.com/events/page/2/', source: 'powerhouse', venue: 'Alliant Energy PowerHouse' },
  // Theatre Cedar Rapids  
  { url: 'https://theatrecedarrapids.org/shows/', source: 'theatre_cr', venue: 'Theatre Cedar Rapids' },
  { url: 'https://theatrecedarrapids.org/season/', source: 'theatre_cr', venue: 'Theatre Cedar Rapids' },
  // NewBo City Market
  { url: 'https://www.newbocitymarket.org/events', source: 'newbo', venue: 'NewBo City Market' },
  // Cedar Rapids City calendar
  { url: 'https://www.cedar-rapids.gov/residents/parks-recreation/programs-events', source: 'cr_parks', venue: null },
  // Roughriders
  { url: 'https://www.roughriders.com/schedule', source: 'roughriders', venue: 'ImOn Ice Arena' },
  // MiLB Kernels
  { url: 'https://www.milb.com/cedar-rapids/schedule', source: 'kernels', venue: 'Veterans Memorial Stadium' },
  // Coe College
  { url: 'https://www.coe.edu/campus-life/events', source: 'coe_college', venue: 'Coe College Auditorium' },
  // Eventbrite Cedar Rapids (may have JSON-LD)
  { url: 'https://www.eventbrite.com/d/ia--cedar-rapids/events/', source: 'eventbrite', venue: null },
  { url: 'https://www.eventbrite.com/d/ia--cedar-rapids/music--events/', source: 'eventbrite', venue: null },
  { url: 'https://www.eventbrite.com/d/ia--cedar-rapids/food-and-drink--events/', source: 'eventbrite', venue: null },
  // 10am shows CR
  { url: 'https://www.thegazette.com/entertainment/events/', source: 'gazette', venue: null },
];

async function scrapeAll() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const city = db.prepare(`SELECT id FROM cities WHERE name LIKE '%Cedar Rapids%' LIMIT 1`).get();
  if (!city) { console.error('Cedar Rapids not in DB'); process.exit(1); }
  const cityId = city.id;

  const venueRows = db.prepare(`SELECT id, name FROM venues WHERE city_id = ?`).all(cityId);
  const venueMap = {};
  for (const v of venueRows) venueMap[v.name.toLowerCase()] = v.id;

  const now = Math.floor(Date.now() / 1000);
  const checkDupe = db.prepare(`SELECT id FROM events WHERE external_id = ? LIMIT 1`);
  const insertStmt = db.prepare(`
    INSERT INTO events (title, description, date_start, type, price, price_amount, currency, source_url, source, venue_id, city_id, status, tags, featured, external_id)
    VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'active', ?, 0, ?)
  `);

  let totalFound = 0, totalInserted = 0, totalDupes = 0;

  for (const src of SOURCES) {
    process.stdout.write(`\n🌐 ${src.url.slice(0, 65)}... `);
    const html = await fetchPage(src.url);
    if (!html) { continue; }

    const events = extractJsonLd(html);
    process.stdout.write(`${events.length} eventos`);
    totalFound += events.length;

    for (const ev of events) {
      if (!ev.title || ev.title.length < 4) continue;

      const dateTs = parseTs(ev.date) ?? (now + 14 * 86400);
      if (dateTs < now - 86400) continue;

      const externalId = ev.url ?? null;
      if (externalId && checkDupe.get(externalId)) { totalDupes++; continue; }

      // Resolve venue
      let venueId = null;
      const venueName = src.venue ?? ev.venue;
      if (venueName) {
        venueId = venueMap[venueName.toLowerCase()] ?? null;
        if (!venueId) {
          for (const [k, v] of Object.entries(venueMap)) {
            if (venueName.toLowerCase().includes(k.slice(0,6)) || k.includes(venueName.toLowerCase().slice(0,6))) {
              venueId = v; break;
            }
          }
        }
      }

      const type = guessType(ev.title);
      const price = ev.isFree ? 'free' : (ev.price ? 'paid' : 'unknown');
      const priceAmt = ev.price && !ev.isFree ? parseFloat(ev.price) || null : null;

      try {
        insertStmt.run(ev.title, ev.description, dateTs, type, price, priceAmt, ev.url, src.source, venueId, cityId, JSON.stringify([src.source, type]), externalId);
        totalInserted++;
      } catch {}
    }
  }

  // Rebuild FTS5
  db.exec(`DELETE FROM events_fts;`);
  db.exec(`INSERT INTO events_fts(rowid, title, description, type, tags) SELECT id, title, COALESCE(description,''), type, COALESCE(tags,'') FROM events;`);

  console.log(`\n\n📊 Resultado:`);
  console.log(`   Encontrados: ${totalFound}`);
  console.log(`   Insertados:  ${totalInserted}`);
  console.log(`   Duplicados:  ${totalDupes}`);

  const total = db.prepare(`SELECT COUNT(*) as n FROM events WHERE city_id = ? AND status='active'`).get(cityId);
  console.log(`   Total en DB: ${total.n}`);

  const list = db.prepare(`
    SELECT e.title, e.type, e.date_start, v.name as vname
    FROM events e LEFT JOIN venues v ON v.id = e.venue_id
    WHERE e.city_id = ? AND e.status='active'
    ORDER BY e.date_start ASC LIMIT 50
  `).all(cityId);

  console.log('\n🗓️  Todos los eventos Cedar Rapids:\n');
  for (const ev of list) {
    const d = new Date(ev.date_start * 1000);
    const date = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }).padEnd(12);
    const venue = ev.vname ? `@ ${ev.vname.slice(0,28)}` : '';
    console.log(`  ${date} [${ev.type.padEnd(11)}] ${ev.title.slice(0,48)} ${venue}`);
  }

  db.close();
}

scrapeAll().catch(e => { console.error(e); process.exit(1); });
