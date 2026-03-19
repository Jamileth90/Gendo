import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const GET = async ({ url }) => {
  const name = url.searchParams.get("name")?.trim();
  const id = url.searchParams.get("id") ? Number(url.searchParams.get("id")) : void 0;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    if (!name && !id) {
      const cities = db.prepare(`
				SELECT c.*, COUNT(e.id) as event_count
				FROM cities c
				LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active' AND e.date_start >= strftime('%s','now')
				GROUP BY c.id ORDER BY event_count DESC, c.name ASC
				LIMIT ?
			`).all(limit);
      return json({ cities });
    }
    const city = id ? db.prepare(`SELECT * FROM cities WHERE id = ?`).get(id) : db.prepare(`SELECT * FROM cities WHERE name LIKE ? LIMIT 1`).get(`%${name}%`);
    if (!city) return json({ error: "City not found" }, { status: 404 });
    const now = Math.floor(Date.now() / 1e3);
    const c = city;
    const events = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.type, e.price, e.price_amount,
				e.featured, e.tags, v.name as venue_name, v.address
			FROM events e LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, e.date_start ASC LIMIT ?
		`).all(c["id"], now, limit);
    const venues = db.prepare(`
			SELECT id, name, type, address, lat, lng, website, instagram, verified, featured
			FROM venues WHERE city_id = ? AND active = 1 ORDER BY featured DESC, name ASC
		`).all(c["id"]);
    const typeCounts = db.prepare(`
			SELECT type, COUNT(*) as count FROM events
			WHERE city_id = ? AND status = 'active' AND date_start >= ?
			GROUP BY type ORDER BY count DESC
		`).all(c["id"], now);
    return json({ city, events, venues, typeCounts, total: events.length });
  } finally {
    db.close();
  }
};

export { GET };
//# sourceMappingURL=_server.ts-3G4bjTO-.js.map
