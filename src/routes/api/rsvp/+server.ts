/**
 * GET  /api/rsvp?eventId=X      — get RSVP counts + attendees
 * POST /api/rsvp                 — set RSVP status (going/interested/not_going)
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSocialDb, getEventRsvp, getUserByToken } from '$lib/social/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const eventId = Number(url.searchParams.get('eventId'));
	if (!eventId) return json({ error: 'eventId required' }, { status: 400 });

	const token = cookies.get('gendo_session');
	const db = getSocialDb();
	try {
		const rsvp = getEventRsvp(eventId);

		let userStatus: string | null = null;
		if (token) {
			const user = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token) as { id: number } | null;
			if (user) {
				const r = db.prepare(`SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?`).get(eventId, user.id) as { status: string } | null;
				userStatus = r?.status ?? null;
			}
		}

		return json({ ...rsvp, userStatus });
	} finally {
		db.close();
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Not logged in' }, { status: 401 });

	const db = getSocialDb();
	try {
		const user = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token) as { id: number } | null;
		if (!user) return json({ error: 'Invalid session' }, { status: 401 });

		const body = await request.json().catch(() => ({}));
		const eventId = Number(body.eventId);
		const status = body.status as string; // going | interested | not_going

		if (!eventId || !['going', 'interested', 'not_going'].includes(status)) {
			return json({ error: 'Invalid eventId or status' }, { status: 400 });
		}

		if (status === 'not_going') {
			// Remove RSVP
			db.prepare(`DELETE FROM event_rsvp WHERE event_id = ? AND user_id = ?`).run(eventId, user.id);
		} else {
			db.prepare(`
				INSERT INTO event_rsvp (event_id, user_id, status)
				VALUES (?, ?, ?)
				ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status
			`).run(eventId, user.id, status);
		}

		const rsvp = getEventRsvp(eventId);
		return json({ ok: true, ...rsvp, userStatus: status === 'not_going' ? null : status });
	} finally {
		db.close();
	}
};
