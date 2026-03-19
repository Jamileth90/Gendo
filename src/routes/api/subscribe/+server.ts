import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { run } from '$lib/db/client';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();
		const e = typeof email === 'string' ? email.trim().toLowerCase() : '';
		if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
			return json({ error: 'Valid email required' }, { status: 400 });
		}
		await run('INSERT OR IGNORE INTO subscribers (email) VALUES (?)', e);
		return json({ success: true, message: 'You\'re in! We\'ll send you weekly picks.' });
	} catch {
		return json({ error: 'Failed to subscribe' }, { status: 500 });
	}
};
