/**
 * GET /api/stats
 * Estadísticas globales de Gendo: ciudades, países, zonas, eventos descubiertos.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { all, get } from '$lib/db/client';

export const GET: RequestHandler = async () => {
	try {
		const [global, countries, topCities, categories, lastDiscovery] = await Promise.all([
			get<Record<string, number>>(`
				SELECT
					(SELECT COUNT(*)        FROM events  WHERE status = 'active')  AS total_events,
					(SELECT COUNT(*)        FROM venues)                           AS total_venues,
					(SELECT COUNT(*)        FROM cities)                           AS total_cities,
					(SELECT COUNT(DISTINCT country_code) FROM cities)              AS total_countries,
					(SELECT COUNT(*)        FROM events WHERE source='discovery_gps') AS gps_events,
					(SELECT COUNT(*)        FROM discovery_cache)                  AS zones_cached,
					(SELECT COUNT(*)        FROM user_preferences)                 AS pref_records
			`),
			all<{ country_code: string; country: string; cities: number; events: number }>(`
				SELECT c.country_code, c.country,
				       COUNT(DISTINCT c.id)   AS cities,
				       COUNT(DISTINCT e.id)   AS events
				FROM cities c
				LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active'
				GROUP BY c.country_code
				ORDER BY events DESC, cities DESC
				LIMIT 20
			`),
			all<{ name: string; country_code: string; state: string | null; events: number }>(`
				SELECT c.name, c.country_code, c.state,
				       COUNT(e.id) AS events
				FROM cities c
				JOIN events e ON e.city_id = c.id AND e.status = 'active'
				GROUP BY c.id
				ORDER BY events DESC
				LIMIT 10
			`),
			all<{ type: string; total: number }>(`
				SELECT type, COUNT(*) AS total
				FROM events
				WHERE source = 'discovery_gps' AND status = 'active'
				GROUP BY type
				ORDER BY total DESC
			`),
			get<{ created_at: number }>(`SELECT created_at FROM discovery_cache ORDER BY created_at DESC LIMIT 1`),
		]);

		return json({
			global: global ?? {},
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
