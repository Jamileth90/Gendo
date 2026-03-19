// @ts-nocheck
import type { PageServerLoad } from './$types';
import Database from 'better-sqlite3';
import { error } from '@sveltejs/kit';
import { getMeetups, getUserByToken } from '$lib/social/db';
import { cleanupPastEvents } from '$lib/db/cleanup';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export const load = async ({ params, cookies }: Parameters<PageServerLoad>[0]) => {
	cleanupPastEvents();
	const slug = params.slug.replace(/-/g, ' ');
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	try {
		const city = db.prepare(`SELECT id, name, country, country_code AS countryCode, state, lat, lng FROM cities WHERE name LIKE ? LIMIT 1`)
			.get(`%${slug}%`) as { id: number; name: string; country: string; countryCode: string; state: string | null; lat: number | null; lng: number | null } | undefined;

		if (!city) throw error(404, `City "${slug}" not found`);

		const now = Math.floor(Date.now() / 1000);

		const eventsRaw = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.date_end,
				e.type, e.price, e.price_amount, e.currency,
				e.source_url, e.image_url, e.featured, e.tags, e.source,
				v.id as venue_id, v.name as venue_name, v.type as venue_type,
				v.address, v.lat as v_lat, v.lng as v_lng,
				v.website, v.instagram, v.verified
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, e.date_start ASC
			LIMIT 100
		`).all(city.id, now) as Record<string, unknown>[];

		// Deduplicar: por id y por clave semántica (title+date+venue) para evitar duplicados de distintas fuentes
		const seenIds = new Set<number>();
		const seenKeys = new Set<string>();
		const events = eventsRaw.filter((ev) => {
			const id = ev['id'] as number;
			if (seenIds.has(id)) return false;
			const key = `${(ev['title'] ?? '').toString().trim().toLowerCase()}|${ev['date_start']}|${ev['venue_id'] ?? 'null'}`;
			if (seenKeys.has(key)) return false;
			seenIds.add(id);
			seenKeys.add(key);
			return true;
		});

		const venues = db.prepare(`
			SELECT id, name, type, address, lat, lng, website, instagram, description, verified, featured
			FROM venues WHERE city_id = ? AND active = 1
			ORDER BY featured DESC, name ASC
		`).all(city.id) as Record<string, unknown>[];

		const typeCounts = db.prepare(`
			SELECT type, COUNT(*) as count FROM events
			WHERE city_id = ? AND status = 'active' AND date_start >= ?
			GROUP BY type ORDER BY count DESC
		`).all(city.id, now) as Array<{ type: string; count: number }>;

		// Meetups for this city
		const token = cookies.get('gendo_session');
		const currentUser = token ? getUserByToken(token) : null;
		const meetups = getMeetups({ cityId: city.id, currentUserId: currentUser?.id, limit: 5 });

		return {
			city,
			events: events.map(ev => ({
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
				venueId: ev['venue_id'] as number | null,
				venueName: ev['venue_name'] as string | null,
				venueAddress: ev['address'] as string | null,
				venueLat: ev['v_lat'] as number | null,
				venueLng: ev['v_lng'] as number | null,
				venueWebsite: ev['website'] as string | null,
				venueInstagram: ev['instagram'] as string | null,
			})),
			venues: venues.map(v => ({
				id: v['id'] as number,
				name: v['name'] as string,
				type: v['type'] as string,
				address: v['address'] as string | null,
				lat: v['lat'] as number | null,
				lng: v['lng'] as number | null,
				website: v['website'] as string | null,
				instagram: v['instagram'] as string | null,
				description: v['description'] as string | null,
				verified: Boolean(v['verified']),
				featured: Boolean(v['featured'])
			})),
			typeCounts,
			meetups,
			currentUser: currentUser ? {
				id: currentUser.id,
				username: currentUser.username,
				displayName: currentUser.display_name,
				avatarUrl: currentUser.avatar_url,
				travelStyle: currentUser.travel_style
			} : null
		};
	} finally {
		db.close();
	}
};
