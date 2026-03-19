import type { PageServerLoad } from './$types';
import { all, get } from '$lib/db/client';

export const load: PageServerLoad = async () => {
	const [totalEvents, totalCities, totalVenues, pendingSubmissions] = await Promise.all([
		get<{ n: number }>('SELECT COUNT(*) as n FROM events WHERE status = ?', 'active'),
		get<{ n: number }>('SELECT COUNT(*) as n FROM cities'),
		get<{ n: number }>('SELECT COUNT(*) as n FROM venues WHERE active = 1'),
		get<{ n: number }>('SELECT COUNT(*) as n FROM submitted_events WHERE status = ?', 'pending'),
	]);

	const stats = {
		totalEvents: totalEvents?.n ?? 0,
		totalCities: totalCities?.n ?? 0,
		totalVenues: totalVenues?.n ?? 0,
		pendingSubmissions: pendingSubmissions?.n ?? 0,
	};

	const bySource = await all<{ source: string; n: number }>(`
		SELECT source, COUNT(*) as n FROM events WHERE status = 'active'
		GROUP BY source ORDER BY n DESC
	`);

	const pending = await all<{
		id: number;
		title: string;
		description: string | null;
		date_start: number;
		date_end: number | null;
		city_name: string;
		venue_name: string | null;
		venue_address: string | null;
		type: string;
		price: string;
		price_amount: number | null;
		source_url: string | null;
		submitter_email: string | null;
		submitter_name: string | null;
		created_at: number;
	}>(`
		SELECT * FROM submitted_events WHERE status = 'pending'
		ORDER BY created_at DESC
	`);

	return { stats, bySource, pending };
};
