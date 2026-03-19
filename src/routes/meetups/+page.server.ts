import type { PageServerLoad } from './$types';
import { getMeetups, getUserByToken } from '$lib/social/db';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const cityName = url.searchParams.get('city')?.trim();
	const cityId = url.searchParams.get('cityId') ? Number(url.searchParams.get('cityId')) : undefined;

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	try {
		let resolvedCityId = cityId;
		let resolvedCity: { id: number; name: string; country: string; state: string | null } | null = null;

		if (!resolvedCityId && cityName) {
			resolvedCity = db.prepare(`SELECT id, name, country, state FROM cities WHERE name LIKE ? LIMIT 1`).get(`%${cityName}%`) as typeof resolvedCity;
			resolvedCityId = resolvedCity?.id;
		} else if (resolvedCityId) {
			resolvedCity = db.prepare(`SELECT id, name, country, state FROM cities WHERE id = ?`).get(resolvedCityId) as typeof resolvedCity;
		}

		const token = cookies.get('gendo_session');
		const currentUser = token ? getUserByToken(token) : null;

		const meetups = getMeetups({ cityId: resolvedCityId, currentUserId: currentUser?.id });

		// Popular cities for discovery
		const popularCities = db.prepare(`
			SELECT c.id, c.name, c.country, c.state, COUNT(m.id) as meetup_count
			FROM cities c
			LEFT JOIN meetups m ON m.city_id = c.id AND m.status = 'active' AND m.date_start >= strftime('%s','now')
			GROUP BY c.id
			ORDER BY meetup_count DESC, c.name ASC
			LIMIT 20
		`).all() as Array<{ id: number; name: string; country: string; state: string | null; meetup_count: number }>;

		return {
			meetups,
			city: resolvedCity,
			popularCities,
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
