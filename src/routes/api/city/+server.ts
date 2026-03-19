import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all, get } from '$lib/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const name = url.searchParams.get('name')?.trim();
	const id = url.searchParams.get('id') ? Number(url.searchParams.get('id')) : undefined;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);

	// List all cities
	if (!name && !id) {
		const now = Math.floor(Date.now() / 1000);
		const cities = await all(`
			SELECT c.*, COUNT(e.id) as event_count
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active' AND e.date_start >= ?
			GROUP BY c.id ORDER BY event_count DESC, c.name ASC
			LIMIT ?
		`, now, limit);
		return json({ cities });
	}

	// Find city
	const city = id
		? await get(`SELECT * FROM cities WHERE id = ?`, id)
		: await get(`SELECT * FROM cities WHERE name LIKE ? LIMIT 1`, `%${name}%`);

	if (!city) return json({ error: 'City not found' }, { status: 404 });

	const now = Math.floor(Date.now() / 1000);
	const c = city as Record<string, unknown>;
	const cityId = c['id'];

	const [events, venues, typeCounts] = await Promise.all([
		all(`SELECT e.id, e.title, e.description, e.date_start, e.type, e.price, e.price_amount,
			e.featured, e.tags, v.name as venue_name, v.address
			FROM events e LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, e.date_start ASC LIMIT ?`, cityId, now, limit),
		all(`SELECT id, name, type, address, lat, lng, website, instagram, verified, featured
			FROM venues WHERE city_id = ? AND active = 1 ORDER BY featured DESC, name ASC`, cityId),
		all(`SELECT type, COUNT(*) as count FROM events
			WHERE city_id = ? AND status = 'active' AND date_start >= ?
			GROUP BY type ORDER BY count DESC`, cityId, now),
	]);

	return json({ city, events, venues, typeCounts, total: events.length });
};
