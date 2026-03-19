import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all } from '$lib/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const cityId = url.searchParams.get('cityId') ? Number(url.searchParams.get('cityId')) : undefined;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 30);

	const now = Math.floor(Date.now() / 1000);
	const cityFilter = cityId ? `AND e.city_id = ${cityId}` : '';

	const events = await all(`
		SELECT e.id, e.title, e.description, e.date_start, e.type,
			e.price, e.price_amount, e.currency, e.image_url, e.featured, e.tags,
			v.name as venue_name, v.address,
			c.name as city_name, c.country, c.state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.status = 'active' AND e.date_start >= ? ${cityFilter}
		ORDER BY e.featured DESC, e.date_start ASC
		LIMIT ?
	`, now, limit);

	return json({ events });
};
