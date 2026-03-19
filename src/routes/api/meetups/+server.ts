/**
 * GET  /api/meetups?city=X&limit=20   — listar meetups
 * POST /api/meetups                    — crear meetup
 * POST /api/meetups?action=join&id=X   — unirse a meetup
 * POST /api/meetups?action=leave&id=X  — salir de meetup
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSocialDb, getMeetups, getUserByToken } from '$lib/social/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const cityId = url.searchParams.get('city') ? Number(url.searchParams.get('city')) : undefined;
	const cityName = url.searchParams.get('cityName')?.trim();
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const token = cookies.get('gendo_session');
	const currentUser = token ? getUserByToken(token) : null;

	const db = getSocialDb();
	try {
		let resolvedCityId = cityId;
		if (!resolvedCityId && cityName) {
			const city = db.prepare(`SELECT id FROM cities WHERE name LIKE ? LIMIT 1`).get(`%${cityName}%`) as { id: number } | null;
			resolvedCityId = city?.id;
		}

		const meetups = getMeetups({ cityId: resolvedCityId, currentUserId: currentUser?.id, limit, offset });
		return json({ meetups, total: meetups.length });
	} finally {
		db.close();
	}
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Not logged in' }, { status: 401 });

	const db = getSocialDb();
	try {
		const user = db.prepare(`SELECT * FROM users WHERE session_token = ?`).get(token) as { id: number } | null;
		if (!user) return json({ error: 'Invalid session' }, { status: 401 });

		const action = url.searchParams.get('action');

		// Join meetup
		if (action === 'join') {
			const meetupId = Number(url.searchParams.get('id'));
			const body = await request.json().catch(() => ({}));
			const message = String(body.message ?? '').trim().slice(0, 200);

			const meetup = db.prepare(`SELECT * FROM meetups WHERE id = ?`).get(meetupId) as { id: number; max_people: number; status: string } | null;
			if (!meetup) return json({ error: 'Meetup not found' }, { status: 404 });
			if (meetup.status === 'full') return json({ error: 'Meetup is full' }, { status: 400 });

			const currentCount = (db.prepare(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`).get(meetupId) as { n: number }).n;
			if (currentCount >= meetup.max_people) {
				db.prepare(`UPDATE meetups SET status = 'full' WHERE id = ?`).run(meetupId);
				return json({ error: 'Meetup is now full' }, { status: 400 });
			}

			db.prepare(`INSERT OR IGNORE INTO meetup_attendees (meetup_id, user_id, message) VALUES (?, ?, ?)`).run(meetupId, user.id, message);
			const count = (db.prepare(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`).get(meetupId) as { n: number }).n;
			return json({ ok: true, attendee_count: count, user_attending: true });
		}

		// Leave meetup
		if (action === 'leave') {
			const meetupId = Number(url.searchParams.get('id'));
			db.prepare(`DELETE FROM meetup_attendees WHERE meetup_id = ? AND user_id = ?`).run(meetupId, user.id);
			const count = (db.prepare(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`).get(meetupId) as { n: number }).n;
			return json({ ok: true, attendee_count: count, user_attending: false });
		}

		// Cancel meetup
		if (action === 'cancel') {
			const meetupId = Number(url.searchParams.get('id'));
			db.prepare(`UPDATE meetups SET status = 'cancelled' WHERE id = ? AND user_id = ?`).run(meetupId, user.id);
			return json({ ok: true });
		}

		// Create meetup
		const body = await request.json().catch(() => ({}));
		const title = String(body.title ?? '').trim();
		const description = String(body.description ?? '').trim().slice(0, 1000);
		const locationName = String(body.locationName ?? body.location_name ?? '').trim().slice(0, 200);
		const locationAddress = String(body.locationAddress ?? '').trim().slice(0, 300);
		const lat = body.lat ? Number(body.lat) : null;
		const lng = body.lng ? Number(body.lng) : null;
		const maxPeople = Math.min(Math.max(Number(body.maxPeople ?? 20), 2), 200);
		const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags.slice(0, 8) : []);

		if (!title || title.length < 5) {
			return json({ error: 'Title must be at least 5 characters' }, { status: 400 });
		}
		if (!locationName) {
			return json({ error: 'Location name is required' }, { status: 400 });
		}

		let dateStart: number;
		if (body.dateStart) {
			dateStart = Math.floor(new Date(body.dateStart).getTime() / 1000);
		} else {
			return json({ error: 'dateStart is required' }, { status: 400 });
		}

		const dateEnd = body.dateEnd ? Math.floor(new Date(body.dateEnd).getTime() / 1000) : null;
		const cityId = body.cityId ? Number(body.cityId) : null;

		const result = db.prepare(`
			INSERT INTO meetups (user_id, city_id, title, description, location_name, location_address, lat, lng, date_start, date_end, max_people, tags)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(user.id, cityId, title, description, locationName, locationAddress, lat, lng, dateStart, dateEnd, maxPeople, tags);

		// Auto-join as organizer
		db.prepare(`INSERT INTO meetup_attendees (meetup_id, user_id, message) VALUES (?, ?, 'Organizer')`).run(result.lastInsertRowid, user.id);

		const meetup = db.prepare(`
			SELECT m.*, u.username, u.display_name, u.avatar_url, u.travel_style,
				1 as attendee_count, 1 as user_attending
			FROM meetups m JOIN users u ON u.id = m.user_id
			WHERE m.id = ?
		`).get(result.lastInsertRowid);

		return json({ ok: true, meetup });
	} finally {
		db.close();
	}
};
