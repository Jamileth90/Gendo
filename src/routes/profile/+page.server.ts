import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getUserByToken } from '$lib/social/db';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) throw redirect(302, '/');

	const user = await getUserByToken(token);
	if (!user) throw redirect(302, '/');

	return {
		user: {
			id: user.id,
			username: user.username,
			display_name: user.display_name,
			avatar_url: user.avatar_url,
			bio: user.bio,
			home_country: user.home_country,
			travel_style: user.travel_style,
		},
	};
};
