import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { get, run } from '$lib/db/client';

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

		let resolvedCityName = cityName?.trim() || null;
		if (!resolvedCityName && cityId) {
			const c = await get<{ name: string }>('SELECT name FROM cities WHERE id = ?', cityId);
			resolvedCityName = c?.name ?? 'Unknown';
		}
		if (!resolvedCityName) resolvedCityName = 'Unknown';

		await run(`
			INSERT INTO submitted_events (title, description, date_start, date_end, city_name, venue_name, venue_address, type, price, price_amount, source_url, submitter_email, submitter_name, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
		`,
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
	} catch (e) {
		console.error('[submit-event]', e);
		return json({ error: 'Failed to submit' }, { status: 500 });
	}
};
