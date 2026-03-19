import type { LayoutServerLoad } from './$types';
import { getUserByToken } from '$lib/social/db';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('gendo_session');
	let user: { id: number; username: string; display_name: string | null; avatar_url: string | null; home_lat?: number; home_lng?: number } | null = null;
	if (token) {
		const u = await getUserByToken(token);
		if (u) {
			const row = u as Record<string, unknown>;
			user = {
				id: row.id as number,
				username: row.username as string,
				display_name: row.display_name as string | null,
				avatar_url: row.avatar_url as string | null,
				home_lat: row.home_lat != null ? Number(row.home_lat) : undefined,
				home_lng: row.home_lng != null ? Number(row.home_lng) : undefined,
			};
		}
	}

	return {
		user,
		// Meta por defecto para SEO (páginas hijas pueden sobrescribir)
		meta: {
			title: 'Gendo — Events & Things to Do in Cedar Rapids, IA',
			description: 'Discover events, concerts, markets, and things to do in Cedar Rapids, Iowa. Free and paid events, live music, festivals, food, and more.',
		},
	};
};
