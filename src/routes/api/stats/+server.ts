/**
 * GET /api/stats
 * Estadísticas globales de Gendo: ciudades, países, zonas, eventos descubiertos.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';

const DB_PATH = './gendo.db';

export const GET: RequestHandler = async () => {
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
		`).get() as Record<string, number>;

		// Países únicos con cantidad de eventos GPS
		const countries = db.prepare(`
			SELECT c.country_code, c.country,
			       COUNT(DISTINCT c.id)   AS cities,
			       COUNT(DISTINCT e.id)   AS events
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active'
			GROUP BY c.country_code
			ORDER BY events DESC, cities DESC
			LIMIT 20
		`).all() as { country_code: string; country: string; cities: number; events: number }[];

		// Top ciudades por eventos
		const topCities = db.prepare(`
			SELECT c.name, c.country_code, c.state,
			       COUNT(e.id) AS events
			FROM cities c
			JOIN events e ON e.city_id = c.id AND e.status = 'active'
			GROUP BY c.id
			ORDER BY events DESC
			LIMIT 10
		`).all() as { name: string; country_code: string; state: string | null; events: number }[];

		// Categorías más populares (tipos de eventos GPS)
		const categories = db.prepare(`
			SELECT type, COUNT(*) AS total
			FROM events
			WHERE source = 'discovery_gps' AND status = 'active'
			GROUP BY type
			ORDER BY total DESC
		`).all() as { type: string; total: number }[];

		// Última actividad del scraper
		const lastDiscovery = db.prepare(`
			SELECT created_at FROM discovery_cache ORDER BY created_at DESC LIMIT 1
		`).get() as { created_at: number } | undefined;

		db.close();

		return json({
			global,
			countries,
			topCities,
			categories,
			lastDiscoveryAt: lastDiscovery ? lastDiscovery.created_at * 1000 : null,
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[stats]', msg);
		return json({ error: msg }, { status: 500 });
	}
};
