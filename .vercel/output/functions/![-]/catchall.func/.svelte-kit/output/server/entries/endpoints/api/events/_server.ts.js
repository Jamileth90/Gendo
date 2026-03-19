import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const GET = async ({ url }) => {
  const cityId = url.searchParams.get("cityId") ? Number(url.searchParams.get("cityId")) : void 0;
  const type = url.searchParams.get("type") ?? void 0;
  const dateFilter = url.searchParams.get("date") ?? "upcoming";
  const featured = url.searchParams.get("featured") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const now = Math.floor(Date.now() / 1e3);
    let dateCond = `e.date_start >= ${now}`;
    if (dateFilter === "today") dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 86400}`;
    else if (dateFilter === "tomorrow") {
      const t = now + 86400;
      dateCond = `e.date_start >= ${t} AND e.date_start < ${t + 86400}`;
    } else if (dateFilter === "week") dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 7 * 86400}`;
    else if (dateFilter === "weekend") {
      const d = /* @__PURE__ */ new Date();
      const daysToSat = (6 - d.getDay() + 7) % 7;
      const sat = now + daysToSat * 86400;
      dateCond = `e.date_start >= ${sat} AND e.date_start < ${sat + 2 * 86400}`;
    }
    const filters = [
      cityId ? `AND e.city_id = ${cityId}` : "",
      type ? `AND e.type = '${type.replace(/'/g, "''")}'` : "",
      featured ? `AND e.featured = 1` : ""
    ].join(" ");
    const events = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.date_end,
				e.type, e.price, e.price_amount, e.currency, e.source_url,
				e.image_url, e.featured, e.tags, e.status,
				v.id as venue_id, v.name as venue_name, v.address, v.lat as v_lat, v.lng as v_lng,
				v.website, v.instagram, v.verified,
				c.id as city_id, c.name as city_name, c.country, c.state
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE e.status = 'active' AND ${dateCond} ${filters}
			ORDER BY e.featured DESC, e.date_start ASC
			LIMIT ? OFFSET ?
		`).all(limit, offset);
    return json({ events, total: events.length });
  } finally {
    db.close();
  }
};
export {
  GET
};
