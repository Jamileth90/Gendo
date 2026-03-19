/**
 * GET /api/debug-page — Reproduce la carga de la página para capturar errores.
 * Eliminar después de depurar.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all, get } from '$lib/db/client';
import { cleanupPastEvents } from '$lib/db/cleanup';

export const GET: RequestHandler = async () => {
	const steps: string[] = [];
	try {
		steps.push('1. cleanup');
		await cleanupPastEvents();

		steps.push('2. user_preferences');
		const now = Math.floor(Date.now() / 1000);
		await all(`SELECT category, click_count FROM user_preferences LIMIT 1`);

		steps.push('3. featured events');
		const featured = await all(
			`SELECT e.id, e.title FROM events e WHERE e.status = 'active' AND e.date_start >= ? AND e.featured = 1 LIMIT 6`,
			now
		);

		steps.push('4. upcoming events');
		const upcoming = await all(
			`SELECT e.id, e.title FROM events e WHERE e.status = 'active' AND e.date_start >= ? LIMIT 120`,
			now
		);

		steps.push('5. cities');
		const cities = await all(
			`SELECT c.id, c.name, c.country_code AS countryCode, c.state, c.lat, c.lng,
				COUNT(e.id) as event_count
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active' AND e.date_start >= ?
			GROUP BY c.id HAVING event_count > 0 LIMIT 50`,
			now
		);

		steps.push('6. stats');
		await get(
			`SELECT
				(SELECT COUNT(*) FROM events WHERE status='active' AND date_start >= ?) as total_events,
				(SELECT COUNT(*) FROM cities) as total_cities,
				(SELECT COUNT(*) FROM venues WHERE active=1) as total_venues`,
			now
		);

		// Probar serialización (como hace SvelteKit)
		steps.push('7. serialize');
		const payload = {
			featured: featured.slice(0, 2),
			cities: cities.slice(0, 2).map((c) => ({
				...c,
				event_count: Number(c.event_count ?? 0),
			})),
			upcoming: upcoming.slice(0, 2),
		};
		JSON.stringify(payload);

		return json({ ok: true, steps });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;
		return json({ ok: false, steps, error: msg, stack }, { status: 500 });
	}
};
