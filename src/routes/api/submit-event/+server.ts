import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			title,
			description,
			dateStart,
			dateEnd,
			cityId,
			cityName,
			venueName,
			venueAddress,
			type = 'other',
			price = 'free',
			priceAmount,
			sourceUrl,
			submitterEmail,
			submitterName,
		} = body;

		if (!title || !title.trim()) {
			return json({ error: 'Title is required' }, { status: 400 });
		}
		if (!cityId && !cityName?.trim()) {
			return json({ error: 'City is required' }, { status: 400 });
		}

		const dateTs = dateStart ? Math.floor(new Date(dateStart).getTime() / 1000) : Math.floor(Date.now() / 1000);
		const dateEndTs = dateEnd ? Math.floor(new Date(dateEnd).getTime() / 1000) : null;

		const db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		try {
			let resolvedCityName = cityName?.trim() || null;
			if (!resolvedCityName && cityId) {
				const c = db.prepare('SELECT name FROM cities WHERE id = ?').get(cityId) as { name: string } | undefined;
				resolvedCityName = c?.name ?? 'Unknown';
			}
			if (!resolvedCityName) resolvedCityName = 'Unknown';

			db.prepare(`
				INSERT INTO submitted_events (title, description, date_start, date_end, city_name, venue_name, venue_address, type, price, price_amount, source_url, submitter_email, submitter_name, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
			`).run(
				title.trim(),
				description?.trim() || null,
				dateTs,
				dateEndTs,
				resolvedCityName,
				venueName?.trim() || null,
				venueAddress?.trim() || null,
				type,
				price,
				priceAmount ? parseFloat(priceAmount) : null,
				sourceUrl?.trim() || null,
				submitterEmail?.trim() || null,
				submitterName?.trim() || null
			);

			return json({ success: true, message: 'Event submitted! We\'ll review it soon.' });
		} finally {
			db.close();
		}
	} catch (e) {
		console.error('[submit-event]', e);
		return json({ error: 'Failed to submit' }, { status: 500 });
	}
};
