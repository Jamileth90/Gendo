import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { all, run } from '$lib/db/client';
import { getUserByToken } from '$lib/social/db';

export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ eventIds: [], isLoggedIn: false });

	const user = await getUserByToken(token);
	if (!user) return json({ eventIds: [], isLoggedIn: false });

	const rows = await all<{ event_id: number }>(`SELECT event_id FROM user_saved_events WHERE user_id = ? ORDER BY created_at DESC`, user.id);
	return json({ eventIds: rows.map((r) => r.event_id), isLoggedIn: true });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Sign in to save events' }, { status: 401 });

	const user = await getUserByToken(token);
	if (!user) return json({ error: 'Invalid session' }, { status: 401 });

	const { eventId } = await request.json();
	if (!eventId || typeof eventId !== 'number') return json({ error: 'eventId required' }, { status: 400 });

	await run(`INSERT OR IGNORE INTO user_saved_events (user_id, event_id) VALUES (?, ?)`, user.id, eventId);
	const rows = await all<{ event_id: number }>(`SELECT event_id FROM user_saved_events WHERE user_id = ?`, user.id);
	return json({ eventIds: rows.map((r) => r.event_id) });
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Sign in to manage saved events' }, { status: 401 });

	const user = await getUserByToken(token);
	if (!user) return json({ error: 'Invalid session' }, { status: 401 });

	const { eventId } = await request.json();
	if (!eventId || typeof eventId !== 'number') return json({ error: 'eventId required' }, { status: 400 });

	await run(`DELETE FROM user_saved_events WHERE user_id = ? AND event_id = ?`, user.id, eventId);
	const rows = await all<{ event_id: number }>(`SELECT event_id FROM user_saved_events WHERE user_id = ?`, user.id);
	return json({ eventIds: rows.map((r) => r.event_id) });
};
