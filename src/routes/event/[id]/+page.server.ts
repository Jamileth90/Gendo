import type { PageServerLoad } from './$types';
import { all, get } from '$lib/db/client';
import { error } from '@sveltejs/kit';
import { getEventComments, getEventRsvp, getUserByToken } from '$lib/social/db';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const id = Number(params.id);
	if (!id) throw error(404, 'Event not found');

	const ev = await get<Record<string, unknown>>(`
		SELECT
			e.*,
			v.id as venue_id, v.name as venue_name, v.type as venue_type,
			v.address, v.lat as v_lat, v.lng as v_lng, v.website, v.instagram,
			v.description as venue_desc,
			c.id as city_id, c.name as city_name, c.country, c.state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.id = ? AND e.status = 'active'
	`, id);

	if (!ev) throw error(404, 'Event not found');

	const now = Math.floor(Date.now() / 1000);
	// Related events (same city/type)
	const related = await all<Record<string, unknown>>(`
		SELECT e.id, e.title, e.date_start, e.type, e.price, e.price_amount,
			v.name as venue_name
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		WHERE e.city_id = ? AND e.type = ? AND e.id != ? AND e.status = 'active'
			AND e.date_start >= ?
		ORDER BY e.date_start ASC LIMIT 4
	`, ev['city_id'], ev['type'], id, now);

	const token = cookies.get('gendo_session');
	const currentUser = token ? await getUserByToken(token) : null;

	const comments = await getEventComments(id, currentUser?.id);
	const rsvp = await getEventRsvp(id);

	let userRsvpStatus: string | null = null;
	if (currentUser) {
		const r = await get<{ status: string }>(`SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?`, id, currentUser.id);
		userRsvpStatus = r?.status ?? null;
	}

		return {
			event: {
				id: ev['id'] as number,
				title: ev['title'] as string,
				description: ev['description'] as string | null,
				dateStart: (ev['date_start'] as number) * 1000,
				dateEnd: ev['date_end'] ? (ev['date_end'] as number) * 1000 : null,
				type: ev['type'] as string,
				price: ev['price'] as string | null,
				priceAmount: ev['price_amount'] as number | null,
				currency: ev['currency'] as string | null,
				sourceUrl: ev['source_url'] as string | null,
				imageUrl: ev['image_url'] as string | null,
				featured: Boolean(ev['featured']),
				tags: ev['tags'] as string | null,
				source: ev['source'] as string,
				venueName: ev['venue_name'] as string | null,
				venueType: ev['venue_type'] as string | null,
				venueAddress: ev['address'] as string | null,
				venueLat: ev['v_lat'] as number | null,
				venueLng: ev['v_lng'] as number | null,
				venueWebsite: ev['website'] as string | null,
				venueInstagram: ev['instagram'] as string | null,
				venueDesc: ev['venue_desc'] as string | null,
				cityName: ev['city_name'] as string | null,
				cityId: ev['city_id'] as number | null,
				country: ev['country'] as string | null,
				state: ev['state'] as string | null
			},
			comments,
			rsvp,
			userRsvpStatus,
			currentUser: currentUser ? {
				id: currentUser.id,
				username: currentUser.username,
				displayName: currentUser.display_name,
				avatarUrl: currentUser.avatar_url,
				travelStyle: currentUser.travel_style
			} : null,
			related: related.map(r => ({
				id: r['id'] as number,
				title: r['title'] as string,
				dateStart: (r['date_start'] as number) * 1000,
				type: r['type'] as string,
				price: r['price'] as string | null,
				priceAmount: r['price_amount'] as number | null,
				venueName: r['venue_name'] as string | null
			}))
		};
};
