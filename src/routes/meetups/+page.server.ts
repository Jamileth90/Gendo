import type { PageServerLoad } from './$types';
import { all, get } from '$lib/db/client';
import { getMeetups, getUserByToken } from '$lib/social/db';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const cityName = url.searchParams.get('city')?.trim();
	const cityId = url.searchParams.get('cityId') ? Number(url.searchParams.get('cityId')) : undefined;

	let resolvedCityId = cityId;
	let resolvedCity: { id: number; name: string; country: string; state: string | null } | null = null;

	if (!resolvedCityId && cityName) {
		resolvedCity = await get<{ id: number; name: string; country: string; state: string | null }>(`SELECT id, name, country, state FROM cities WHERE name LIKE ? LIMIT 1`, `%${cityName}%`);
		resolvedCityId = resolvedCity?.id ?? undefined;
	} else if (resolvedCityId) {
		resolvedCity = await get<{ id: number; name: string; country: string; state: string | null }>(`SELECT id, name, country, state FROM cities WHERE id = ?`, resolvedCityId);
	}

	const token = cookies.get('gendo_session');
	const currentUser = token ? await getUserByToken(token) : null;

	const meetups = await getMeetups({ cityId: resolvedCityId, currentUserId: currentUser?.id });

	const now = Math.floor(Date.now() / 1000);
	const popularCities = await all<{ id: number; name: string; country: string; state: string | null; meetup_count: number }>(`
		SELECT c.id, c.name, c.country, c.state, COUNT(m.id) as meetup_count
		FROM cities c
		LEFT JOIN meetups m ON m.city_id = c.id AND m.status = 'active' AND m.date_start >= ?
		GROUP BY c.id
		ORDER BY meetup_count DESC, c.name ASC
		LIMIT 20
	`, now);

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
};
