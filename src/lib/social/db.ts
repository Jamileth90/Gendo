/**
 * Social features DB helpers — usa $lib/db/client (Turso o SQLite local)
 */
import { all, get, run } from '$lib/db/client';

// ── Types ─────────────────────────────────────────────────────────────────

export interface User {
	id: number;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	bio: string | null;
	home_country: string | null;
	travel_style: string;
	created_at: number;
}

export interface Comment {
	id: number;
	event_id: number;
	user_id: number;
	parent_id: number | null;
	content: string;
	likes: number;
	created_at: number;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	travel_style: string;
	user_liked: boolean;
	replies?: Comment[];
}

export interface Meetup {
	id: number;
	user_id: number;
	city_id: number | null;
	title: string;
	description: string | null;
	location_name: string | null;
	location_address: string | null;
	lat: number | null;
	lng: number | null;
	date_start: number;
	date_end: number | null;
	max_people: number;
	tags: string;
	status: string;
	created_at: number;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	travel_style: string;
	attendee_count: number;
	user_attending: boolean;
}

// ── User helpers ──────────────────────────────────────────────────────────

export async function getUserByToken(token: string): Promise<User | null> {
	return get<User>(`SELECT * FROM users WHERE session_token = ?`, token);
}

export async function getUserById(id: number): Promise<User | null> {
	return get<User>(`SELECT * FROM users WHERE id = ?`, id);
}

// ── Comments ──────────────────────────────────────────────────────────────

export async function getEventComments(eventId: number, currentUserId?: number): Promise<Comment[]> {
	const rows = await all<Comment & { user_liked: number }>(`
		SELECT
			c.*,
			u.username, u.display_name, u.avatar_url, u.travel_style,
			(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes,
			${currentUserId
				? `(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId}) as user_liked`
				: `0 as user_liked`
			}
		FROM event_comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.event_id = ? AND c.parent_id IS NULL
		ORDER BY c.created_at ASC
	`, eventId);

	const result: Comment[] = [];
	for (const comment of rows) {
		comment.user_liked = Boolean(comment.user_liked);
		const replies = await all<Comment & { user_liked: number }>(`
			SELECT
				c.*,
				u.username, u.display_name, u.avatar_url, u.travel_style,
				(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes,
				${currentUserId
					? `(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId}) as user_liked`
					: `0 as user_liked`
				}
			FROM event_comments c
			JOIN users u ON u.id = c.user_id
			WHERE c.parent_id = ?
			ORDER BY c.created_at ASC
		`, comment.id);
		for (const r of replies) r.user_liked = Boolean(r.user_liked);
		comment.replies = replies;
		result.push(comment);
	}
	return result;
}

// ── RSVP ─────────────────────────────────────────────────────────────────

export async function getEventRsvp(eventId: number) {
	const counts = await all<{ status: string; count: number }>(`
		SELECT status, COUNT(*) as count
		FROM event_rsvp
		WHERE event_id = ?
		GROUP BY status
	`, eventId);

	const attendees = await all(`
		SELECT u.username, u.display_name, u.avatar_url, u.home_country, u.travel_style, r.status
		FROM event_rsvp r
		JOIN users u ON u.id = r.user_id
		WHERE r.event_id = ? AND r.status = 'going'
		ORDER BY r.created_at DESC
		LIMIT 20
	`, eventId);

	return { counts, attendees };
}

// ── Meetups ───────────────────────────────────────────────────────────────

export async function getMeetups(opts: {
	cityId?: number;
	currentUserId?: number;
	limit?: number;
	offset?: number;
	upcoming?: boolean;
}): Promise<Meetup[]> {
	const { cityId, currentUserId, limit = 20, offset = 0, upcoming = true } = opts;
	const now = Math.floor(Date.now() / 1000);
	const cityFilter = cityId ? `AND m.city_id = ${cityId}` : '';
	const dateFilter = upcoming ? `AND m.date_start >= ${now - 3600}` : '';

	const rows = await all<Meetup & { user_attending: number }>(`
		SELECT
			m.*,
			u.username, u.display_name, u.avatar_url, u.travel_style, u.home_country,
			(SELECT COUNT(*) FROM meetup_attendees ma WHERE ma.meetup_id = m.id) as attendee_count,
			${currentUserId
				? `(SELECT COUNT(*) FROM meetup_attendees ma WHERE ma.meetup_id = m.id AND ma.user_id = ${currentUserId}) as user_attending`
				: `0 as user_attending`
			}
		FROM meetups m
		JOIN users u ON u.id = m.user_id
		WHERE m.status = 'active'
		${cityFilter}
		${dateFilter}
		ORDER BY m.date_start ASC
		LIMIT ? OFFSET ?
	`, limit, offset);

	for (const m of rows) {
		m.user_attending = Boolean(m.user_attending);
	}
	return rows;
}
