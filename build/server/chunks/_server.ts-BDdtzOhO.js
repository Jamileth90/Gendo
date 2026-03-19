import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
function getRawDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}
function searchEvents(opts) {
  const { query, cityId, type, limit = 20, offset = 0 } = opts;
  if (!query.trim()) return [];
  const db = getRawDb();
  try {
    const words = query.trim().split(/\s+/).filter(Boolean);
    const ftsQuery = words.map((w, i) => {
      const clean = w.replace(/["'*^]/g, "");
      return i === words.length - 1 ? `${clean}*` : clean;
    }).join(" ");
    const now = Math.floor(Date.now() / 1e3);
    let dateCond = `e.date_start >= ${now}`;
    if (opts.dateFilter === "today") dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 86400}`;
    else if (opts.dateFilter === "tomorrow") {
      const t = now + 86400;
      dateCond = `e.date_start >= ${t} AND e.date_start < ${t + 86400}`;
    } else if (opts.dateFilter === "week") dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 7 * 86400}`;
    const cityFilter = cityId ? `AND e.city_id = ${cityId}` : "";
    const typeFilter = type ? `AND e.type = '${type.replace(/'/g, "''")}'` : "";
    const sql = `
			SELECT e.*, v.name as v_name, v.address as v_address, v.website as v_website,
				v.instagram as v_instagram, v.verified as v_verified,
				c.name as c_name, c.country as c_country, c.state as c_state,
				bm25(events_fts) as rank,
				snippet(events_fts, 0, '<mark>', '</mark>', '...', 10) as snippet
			FROM events_fts
			JOIN events e ON e.id = events_fts.rowid
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE events_fts MATCH ?
				AND e.status = 'active' AND ${dateCond}
				${cityFilter} ${typeFilter}
			ORDER BY e.featured DESC, rank
			LIMIT ? OFFSET ?
		`;
    const rows = db.prepare(sql).all(ftsQuery, limit, offset);
    return rows.map((row) => ({ rank: row["rank"], snippet: row["snippet"], event: row }));
  } catch {
    return fallbackSearch(query, opts, db);
  } finally {
    db.close();
  }
}
function fallbackSearch(query, opts, db) {
  const now = Math.floor(Date.now() / 1e3);
  const rows = db.prepare(`
		SELECT e.*, v.name as v_name, v.address as v_address,
			c.name as c_name, c.country as c_country, c.state as c_state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE (e.title LIKE ? OR e.description LIKE ? OR v.name LIKE ?)
			AND e.status = 'active' AND e.date_start >= ?
		ORDER BY e.featured DESC, e.date_start ASC
		LIMIT ? OFFSET ?
	`).all(`%${query}%`, `%${query}%`, `%${query}%`, now, opts.limit ?? 20, opts.offset ?? 0);
  return rows.map((row) => ({ rank: 0, event: row }));
}
function getSearchSuggestions(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];
  const db = getRawDb();
  try {
    const ftsQuery = `${query.trim().replace(/["'*^]/g, "")}*`;
    const now = Math.floor(Date.now() / 1e3);
    return db.prepare(`
			SELECT e.id, e.title, e.type, e.date_start, c.name as city_name
			FROM events_fts
			JOIN events e ON e.id = events_fts.rowid
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE events_fts MATCH ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, bm25(events_fts)
			LIMIT ?
		`).all(ftsQuery, now, limit);
  } catch {
    return [];
  } finally {
    db.close();
  }
}
const GET = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim() ?? "";
  const suggest = url.searchParams.get("suggest") === "true";
  const cityId = url.searchParams.get("cityId") ? Number(url.searchParams.get("cityId")) : void 0;
  const type = url.searchParams.get("type") ?? void 0;
  const dateFilter = url.searchParams.get("date");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (!q || q.length < 1) return json({ events: [], suggestions: [], total: 0 });
  if (suggest) {
    const suggestions = getSearchSuggestions(q, 8);
    return json({ suggestions });
  }
  const results = searchEvents({ query: q, cityId, type, dateFilter, limit, offset });
  return json({
    events: results.map((r) => ({ ...r.event, rank: r.rank, snippet: r.snippet })),
    total: results.length,
    query: q
  });
};

export { GET };
//# sourceMappingURL=_server.ts-BDdtzOhO.js.map
