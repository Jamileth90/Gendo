/**
 * Meetup.com public scraper — NO API key needed
 * Uses public HTML + JSON-LD data from Meetup's search pages
 */
import Database from 'better-sqlite3';

const DB_PATH = '/Users/jamileth/gendo_v2/gendo.db';
const DELAY_MS = 2500;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function guessType(title) {
  const t = title.toLowerCase();
  if (/concert|music|band|live|tour|jazz|blues|country|rock|pop|dj |hip.hop|fest|sing|choir/i.test(t)) return 'live_music';
  if (/comedy|stand.?up|improv|funny/i.test(t)) return 'comedy';
  if (/theater|theatre|opera|symphony|ballet|dance|perform/i.test(t)) return 'theater';
  if (/food|beer|wine|eat|drink|tast|market|farm|cook|culinary|chef|bake|brew/i.test(t)) return 'food';
  if (/art|exhibit|gallery|museum|photo|paint|sculpt|craft/i.test(t)) return 'art';
  if (/game|match|vs\.?|fight|race|sport|football|basketball|hockey|baseball|soccer|run|marathon|5k|triath/i.test(t)) return 'sports';
  if (/festival|fair|parade|celebrat|carnival|gala/i.test(t)) return 'festival';
  if (/film|movie|cinema|screen/i.test(t)) return 'cinema';
  if (/tech|coding|developer|startup|hack|AI|data|cloud|agile/i.test(t)) return 'other';
  return 'other';
}

async function fetchMeetupEvents(cityName, state) {
  const location = state ? `${cityName}, ${state}` : cityName;
  const url = `https://www.meetup.com/find/?location=${encodeURIComponent(location)}&source=EVENTS&distance=tenMiles`;
  
  try {
    process.stdout.write(`  Fetching Meetup ${location}... `);
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.log(`HTTP ${res.status}`); return []; }
    const html = await res.text();
    
    const events = [];
    const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    
    for (const match of lds) {
      try {
        const d = JSON.parse(match[1]);
        const arr = Array.isArray(d) ? d : [d];
        for (const item of arr) {
          if (!item || (item['@type'] !== 'Event' && item['@type'] !== 'SocialEvent')) continue;
          if (!item.name) continue;
          
          const loc = item.location ?? {};
          const addr = typeof loc.address === 'object' ? loc.address : {};
          
          events.push({
            title: String(item.name).trim(),
            description: item.description ? String(item.description).slice(0, 500) : null,
            dateStart: item.startDate ?? null,
            dateEnd: item.endDate ?? null,
            venueName: loc.name ?? null,
            cityName: addr.addressLocality ?? cityName,
            url: item.url ?? null,
            imageUrl: typeof item.image === 'string' ? item.image : null,
          });
        }
      } catch {}
    }
    
    process.stdout.write(`${events.length} events\n`);
    return events;
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return [];
  }
}

async function scrapeCity(db, city) {
  const { id: cityId, name, state, country } = city;
  
  const events = await fetchMeetupEvents(name, state);
  if (events.length === 0) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const checkDupe = db.prepare(`SELECT id FROM events WHERE external_id = ? LIMIT 1`);
  const insertEvt = db.prepare(`
    INSERT OR IGNORE INTO events 
      (title, description, date_start, date_end, type, price, price_amount, currency, source_url, image_url, source, venue_id, city_id, status, tags, featured, external_id)
    VALUES (?, ?, ?, ?, ?, 'unknown', null, 'USD', ?, ?, 'meetup', null, ?, 'active', ?, 0, ?)
  `);
  
  let inserted = 0;
  for (const ev of events) {
    if (!ev.title || ev.title.length < 3) continue;
    
    let dateStartTs = null;
    if (ev.dateStart) {
      const d = new Date(ev.dateStart);
      if (!isNaN(d.getTime())) {
        dateStartTs = Math.floor(d.getTime() / 1000);
        if (dateStartTs < now - 86400) continue;
      }
    }
    if (!dateStartTs) continue;
    
    let dateEndTs = null;
    if (ev.dateEnd) {
      const d = new Date(ev.dateEnd);
      if (!isNaN(d.getTime())) dateEndTs = Math.floor(d.getTime() / 1000);
    }
    
    const externalId = ev.url ?? null;
    if (externalId && checkDupe.get(externalId)) continue;
    
    const type = guessType(ev.title);
    const tags = JSON.stringify(['meetup', type, name.toLowerCase().replace(/\s+/g, '-')]);
    
    try {
      insertEvt.run(ev.title, ev.description, dateStartTs, dateEndTs, type, ev.url, ev.imageUrl, cityId, tags, externalId);
      inserted++;
    } catch {}
  }
  
  if (inserted > 0) console.log(`  ✅ ${inserted}/${events.length} meetup events inserted for ${name}`);
  return inserted;
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  const targetCity = process.argv[2];
  let cities;
  if (targetCity) {
    cities = db.prepare(`SELECT * FROM cities WHERE name LIKE ? LIMIT 1`).all(`%${targetCity}%`);
  } else {
    cities = db.prepare(`SELECT * FROM cities ORDER BY name`).all();
  }
  
  console.log(`\n🚀 Meetup.com scraper — ${cities.length} cities`);
  console.log('📡 Source: Meetup.com public pages\n');
  
  let total = 0;
  for (const city of cities) {
    total += await scrapeCity(db, city);
    await sleep(DELAY_MS);
  }
  
  if (total > 0) {
    console.log('\n🔍 Rebuilding FTS5 index...');
    db.exec(`DELETE FROM events_fts;`);
    db.exec(`INSERT INTO events_fts(rowid, title, description, type, tags) SELECT id, title, COALESCE(description,''), type, COALESCE(tags,'') FROM events;`);
  }
  
  const totalDb = db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get();
  console.log(`\n✅ Done! +${total} new Meetup events. Total in DB: ${totalDb.n}`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
