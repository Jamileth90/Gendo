import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = "./gendo.db";
const GET = async () => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const global = db.prepare(`
			SELECT
				(SELECT COUNT(*)        FROM events  WHERE status = 'active')  AS total_events,
				(SELECT COUNT(*)        FROM venues)                           AS total_venues,
				(SELECT COUNT(*)        FROM cities)                           AS total_cities,
				(SELECT COUNT(DISTINCT country_code) FROM cities)              AS total_countries,
				(SELECT COUNT(*)        FROM events WHERE source='discovery_gps') AS gps_events,
				(SELECT COUNT(*)        FROM discovery_cache)                  AS zones_cached,
				(SELECT COUNT(*)        FROM user_preferences)                 AS pref_records
		`).get();
    const countries = db.prepare(`
			SELECT c.country_code, c.country,
			       COUNT(DISTINCT c.id)   AS cities,
			       COUNT(DISTINCT e.id)   AS events
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active'
			GROUP BY c.country_code
			ORDER BY events DESC, cities DESC
			LIMIT 20
		`).all();
    const topCities = db.prepare(`
			SELECT c.name, c.country_code, c.state,
			       COUNT(e.id) AS events
			FROM cities c
			JOIN events e ON e.city_id = c.id AND e.status = 'active'
			GROUP BY c.id
			ORDER BY events DESC
			LIMIT 10
		`).all();
    const categories = db.prepare(`
			SELECT type, COUNT(*) AS total
			FROM events
			WHERE source = 'discovery_gps' AND status = 'active'
			GROUP BY type
			ORDER BY total DESC
		`).all();
    const lastDiscovery = db.prepare(`
			SELECT created_at FROM discovery_cache ORDER BY created_at DESC LIMIT 1
		`).get();
    db.close();
    return json({
      global,
      countries,
      topCities,
      categories,
      lastDiscoveryAt: lastDiscovery ? lastDiscovery.created_at * 1e3 : null
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stats]", msg);
    return json({ error: msg }, { status: 500 });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-CQqW6VLf.js.map
