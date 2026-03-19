/**
 * GET  /api/meetups?city=X&limit=20   — listar meetups
 * POST /api/meetups                    — crear meetup
 * POST /api/meetups?action=join&id=X   — unirse a meetup
 * POST /api/meetups?action=leave&id=X  — salir de meetup
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all, get, run } from '$lib/db/client';
import { getMeetups, getUserByToken } from '$lib/social/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const cityId = url.searchParams.get('city') ? Number(url.searchParams.get('city')) : undefined;
	const cityName = url.searchParams.get('cityName')?.trim();
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const token = cookies.get('gendo_session');
	const currentUser = token ? await getUserByToken(token) : null;

	let resolvedCityId = cityId;
	if (!resolvedCityId && cityName) {
		const city = await get<{ id: number }>(`SELECT id FROM cities WHERE name LIKE ? LIMIT 1`, `%${cityName}%`);
		resolvedCityId = city?.id;
	}

	const meetups = await getMeetups({ cityId: resolvedCityId, currentUserId: currentUser?.id, limit, offset });
	return json({ meetups, total: meetups.length });
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Not logged in' }, { status: 401 });

	const user = await get<{ id: number }>(`SELECT * FROM users WHERE session_token = ?`, token);
	if (!user) return json({ error: 'Invalid session' }, { status: 401 });

	const action = url.searchParams.get('action');

	if (action === 'join') {
		const meetupId = Number(url.searchParams.get('id'));
		const body = await request.json().catch(() => ({}));
		const message = String(body.message ?? '').trim().slice(0, 200);

		const meetup = await get<{ id: number; max_people: number; status: string }>(`SELECT * FROM meetups WHERE id = ?`, meetupId);
		if (!meetup) return json({ error: 'Meetup not found' }, { status: 404 });
		if (meetup.status === 'full') return json({ error: 'Meetup is full' }, { status: 400 });

		const currentCountRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`, meetupId);
		const currentCount = currentCountRow?.n ?? 0;
		if (currentCount >= meetup.max_people) {
			await run(`UPDATE meetups SET status = 'full' WHERE id = ?`, meetupId);
			return json({ error: 'Meetup is now full' }, { status: 400 });
		}

		await run(`INSERT OR IGNORE INTO meetup_attendees (meetup_id, user_id, message) VALUES (?, ?, ?)`, meetupId, user.id, message);
		const countRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`, meetupId);
		return json({ ok: true, attendee_count: countRow?.n ?? 0, user_attending: true });
	}

	if (action === 'leave') {
		const meetupId = Number(url.searchParams.get('id'));
		await run(`DELETE FROM meetup_attendees WHERE meetup_id = ? AND user_id = ?`, meetupId, user.id);
		const countRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM meetup_attendees WHERE meetup_id = ?`, meetupId);
		return json({ ok: true, attendee_count: countRow?.n ?? 0, user_attending: false });
	}

	if (action === 'cancel') {
		const meetupId = Number(url.searchParams.get('id'));
		await run(`UPDATE meetups SET status = 'cancelled' WHERE id = ? AND user_id = ?`, meetupId, user.id);
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

	const result = await run(`
		INSERT INTO meetups (user_id, city_id, title, description, location_name, location_address, lat, lng, date_start, date_end, max_people, tags)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, user.id, cityId, title, description, locationName, locationAddress, lat, lng, dateStart, dateEnd, maxPeople, tags);

	const lastId = result.lastInsertRowid != null ? Number(result.lastInsertRowid) : 0;
	await run(`INSERT INTO meetup_attendees (meetup_id, user_id, message) VALUES (?, ?, 'Organizer')`, lastId, user.id);

	const meetup = await get(`
		SELECT m.*, u.username, u.display_name, u.avatar_url, u.travel_style,
			1 as attendee_count, 1 as user_attending
		FROM meetups m JOIN users u ON u.id = m.user_id
		WHERE m.id = ?
	`, lastId);

	return json({ ok: true, meetup });
};
