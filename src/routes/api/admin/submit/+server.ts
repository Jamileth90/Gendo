import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { get, run } from '$lib/db/client';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { id, action } = await request.json();
		if (!id || !['approve', 'reject'].includes(action)) {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		const sub = await get<{
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
		}>('SELECT * FROM submitted_events WHERE id = ? AND status = ?', id, 'pending');

		if (!sub) {
			return json({ error: 'Submission not found or already processed' }, { status: 404 });
		}

		if (action === 'reject') {
			await run('UPDATE submitted_events SET status = ? WHERE id = ?', 'rejected', id);
			return json({ success: true, action: 'rejected' });
		}

		// Approve: find or create city, find or create venue, insert event
		let city = await get<{ id: number }>('SELECT id FROM cities WHERE name LIKE ? LIMIT 1', `%${sub.city_name}%`);
		if (!city) {
			await run(`INSERT INTO cities (name, country, country_code) VALUES (?, 'USA', 'US')`, sub.city_name);
			city = await get<{ id: number }>('SELECT id FROM cities WHERE name = ?', sub.city_name);
		}

		let venueId: number | null = null;
		if (sub.venue_name && city) {
			let venue = await get<{ id: number }>('SELECT id FROM venues WHERE city_id = ? AND name LIKE ? LIMIT 1', city.id, `%${sub.venue_name}%`);
			if (!venue) {
				await run(`INSERT INTO venues (city_id, name, type, address) VALUES (?, ?, ?, ?)`, city.id, sub.venue_name, 'other', sub.venue_address);
				venue = await get<{ id: number }>('SELECT id FROM venues WHERE city_id = ? AND name = ?', city.id, sub.venue_name);
			}
			venueId = venue?.id ?? null;
		}

		if (!city) {
			return json({ error: 'Failed to create city' }, { status: 500 });
		}

		await run(`
			INSERT INTO events (title, description, date_start, date_end, type, price, price_amount, source_url, source, venue_id, city_id, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user_submit', ?, ?, 'active')
		`, sub.title, sub.description, sub.date_start, sub.date_end, sub.type, sub.price, sub.price_amount, sub.source_url, venueId, city.id);

		await run('UPDATE submitted_events SET status = ? WHERE id = ?', 'approved', id);
		return json({ success: true, action: 'approved' });
	} catch (e) {
		console.error('[admin/submit]', e);
		return json({ error: 'Failed' }, { status: 500 });
	}
};
