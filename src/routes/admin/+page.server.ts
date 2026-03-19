import type { PageServerLoad } from './$types';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export const load: PageServerLoad = async () => {
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	try {
		const stats = {
			totalEvents: (db.prepare('SELECT COUNT(*) as n FROM events WHERE status = ?').get('active') as { n: number }).n,
			totalCities: (db.prepare('SELECT COUNT(*) as n FROM cities').get() as { n: number }).n,
			totalVenues: (db.prepare('SELECT COUNT(*) as n FROM venues WHERE active = 1').get() as { n: number }).n,
			pendingSubmissions: (db.prepare('SELECT COUNT(*) as n FROM submitted_events WHERE status = ?').get('pending') as { n: number }).n,
		};

		const bySource = db.prepare(`
			SELECT source, COUNT(*) as n FROM events WHERE status = 'active'
			GROUP BY source ORDER BY n DESC
		`).all() as Array<{ source: string; n: number }>;

		const pending = db.prepare(`
			SELECT * FROM submitted_events WHERE status = 'pending'
			ORDER BY created_at DESC
		`).all() as Array<{
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
		}>;

		return { stats, bySource, pending };
	} finally {
		db.close();
	}
};
