import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all } from '$lib/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const idsParam = url.searchParams.get('ids');
	if (!idsParam) return json({ events: [] });

	const ids = idsParam.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
	if (ids.length === 0) return json({ events: [] });

	const placeholders = ids.map(() => '?').join(',');
	const events = await all<Record<string, unknown>>(`
		SELECT e.id, e.title, e.description, e.date_start, e.date_end,
			e.type, e.price, e.price_amount, e.currency, e.source_url,
			e.image_url, e.featured, e.tags,
			v.name as venue_name, v.address, v.lat as v_lat, v.lng as v_lng,
			c.name as city_name, c.country, c.state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.id IN (${placeholders}) AND e.status = 'active'
		ORDER BY e.date_start ASC
	`, ...ids);

	return json({
		events: events.map((ev) => ({
			id: ev.id,
			title: ev.title,
			description: ev.description,
			dateStart: (ev.date_start as number) * 1000,
			dateEnd: ev.date_end ? (ev.date_end as number) * 1000 : null,
			type: ev.type,
			price: ev.price,
			priceAmount: ev.price_amount,
			currency: ev.currency,
			sourceUrl: ev.source_url,
			imageUrl: ev.image_url,
			featured: Boolean(ev.featured),
			tags: ev.tags,
			venueName: ev.venue_name,
			venueAddress: ev.address,
			venueLat: ev.v_lat,
			venueLng: ev.v_lng,
			cityName: ev.city_name,
			country: ev.country,
			state: ev.state,
		})),
	});
};
