/**
 * GET /api/events/by-bounds?swLat=&swLng=&neLat=&neLng=
 *
 * Devuelve eventos cuya ubicación (venue o ciudad) está dentro del bounding box
 * visible en el mapa. Usado para búsqueda por viewport (sin radio manual).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all } from '$lib/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const swLat = parseFloat(url.searchParams.get('swLat') ?? '');
	const swLng = parseFloat(url.searchParams.get('swLng') ?? '');
	const neLat = parseFloat(url.searchParams.get('neLat') ?? '');
	const neLng = parseFloat(url.searchParams.get('neLng') ?? '');

	if (![swLat, swLng, neLat, neLng].every((n) => !isNaN(n))) {
		return json({ error: 'swLat, swLng, neLat, neLng requeridos' }, { status: 400 });
	}

	const minLat = Math.min(swLat, neLat);
	const maxLat = Math.max(swLat, neLat);
	const minLng = Math.min(swLng, neLng);
	const maxLng = Math.max(swLng, neLng);

	const now = Math.floor(Date.now() / 1000);

	const events = await all<Record<string, unknown>>(`
		SELECT e.id, e.title, e.description, e.date_start, e.date_end,
			e.type, e.price, e.price_amount, e.currency, e.source_url,
			e.image_url, e.featured, e.tags,
			v.id as venue_id, v.name as venue_name, v.address, v.lat as v_lat, v.lng as v_lng,
			c.id as city_id, c.name as city_name, c.country, c.state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.status = 'active' AND e.date_start >= ?
		  AND (
			(v.lat IS NOT NULL AND v.lat BETWEEN ? AND ? AND v.lng BETWEEN ? AND ?)
			OR
			(v.lat IS NULL AND c.lat IS NOT NULL AND c.lat BETWEEN ? AND ? AND c.lng BETWEEN ? AND ?)
		  )
		ORDER BY e.featured DESC, e.date_start ASC
		LIMIT 200
	`, now, minLat, maxLat, minLng, maxLng, minLat, maxLat, minLng, maxLng);

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
			venueId: ev.venue_id,
			venueName: ev.venue_name,
			venueAddress: ev.address,
			venueLat: ev.v_lat,
			venueLng: ev.v_lng,
			cityId: ev.city_id,
			cityName: ev.city_name,
			cityState: ev.state,
			cityCountry: ev.country,
		})),
	});
};
