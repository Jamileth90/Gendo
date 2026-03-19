import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { id, action } = await request.json();
		if (!id || !['approve', 'reject'].includes(action)) {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		const db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		try {
			const sub = db.prepare('SELECT * FROM submitted_events WHERE id = ? AND status = ?').get(id, 'pending') as {
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
			} | undefined;

			if (!sub) {
				return json({ error: 'Submission not found or already processed' }, { status: 404 });
			}

			if (action === 'reject') {
				db.prepare('UPDATE submitted_events SET status = ? WHERE id = ?').run('rejected', id);
				return json({ success: true, action: 'rejected' });
			}

			// Approve: find or create city, find or create venue, insert event
			let city = db.prepare('SELECT id FROM cities WHERE name LIKE ? LIMIT 1').get(`%${sub.city_name}%`) as { id: number } | undefined;
			if (!city) {
				db.prepare(`
					INSERT INTO cities (name, country, country_code) VALUES (?, 'USA', 'US')
				`).run(sub.city_name);
				city = db.prepare('SELECT id FROM cities WHERE name = ?').get(sub.city_name) as { id: number };
			}

			let venueId: number | null = null;
			if (sub.venue_name) {
				let venue = db.prepare('SELECT id FROM venues WHERE city_id = ? AND name LIKE ? LIMIT 1').get(city.id, `%${sub.venue_name}%`) as { id: number } | undefined;
				if (!venue) {
					db.prepare(`
						INSERT INTO venues (city_id, name, type, address) VALUES (?, ?, ?, ?)
					`).run(city.id, sub.venue_name, 'other', sub.venue_address);
					venue = db.prepare('SELECT id FROM venues WHERE city_id = ? AND name = ?').get(city.id, sub.venue_name) as { id: number };
				}
				venueId = venue?.id ?? null;
			}

			db.prepare(`
				INSERT INTO events (title, description, date_start, date_end, type, price, price_amount, source_url, source, venue_id, city_id, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user_submit', ?, ?, 'active')
			`).run(
				sub.title,
				sub.description,
				sub.date_start,
				sub.date_end,
				sub.type,
				sub.price,
				sub.price_amount,
				sub.source_url,
				venueId,
				city.id
			);

			db.prepare('UPDATE submitted_events SET status = ? WHERE id = ?').run('approved', id);
			return json({ success: true, action: 'approved' });
		} finally {
			db.close();
		}
	} catch (e) {
		console.error('[admin/submit]', e);
		return json({ error: 'Failed' }, { status: 500 });
	}
};
