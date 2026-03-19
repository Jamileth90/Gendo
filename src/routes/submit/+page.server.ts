import type { PageServerLoad } from './$types';
import { all } from '$lib/db/client';

export const load: PageServerLoad = async () => {
	const cities = await all<{ id: number; name: string; state: string | null; country: string }>(`
		SELECT id, name, state, country FROM cities
		ORDER BY name ASC LIMIT 200
	`);
	return { cities };
};
