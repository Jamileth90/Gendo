/**
 * Social features DB helpers — all raw better-sqlite3 queries
 * (Drizzle doesn't know about the new social tables)
 */
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

export function getSocialDb() {
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	return db;
}

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

export function getUserByToken(token: string): User | null {
	const db = getSocialDb();
	try {
		return db.prepare(`SELECT * FROM users WHERE session_token = ?`).get(token) as User | null;
	} finally { db.close(); }
}

export function getUserById(id: number): User | null {
	const db = getSocialDb();
	try {
		return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | null;
	} finally { db.close(); }
}

// ── Comments ──────────────────────────────────────────────────────────────

export function getEventComments(eventId: number, currentUserId?: number): Comment[] {
	const db = getSocialDb();
	try {
		const rows = db.prepare(`
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
		`).all(eventId) as Comment[];

		// Get replies for each comment
		for (const comment of rows) {
			comment.user_liked = Boolean(comment.user_liked);
			comment.replies = db.prepare(`
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
			`).all(comment.id) as Comment[];
			for (const r of comment.replies) r.user_liked = Boolean(r.user_liked);
		}

		return rows;
	} finally { db.close(); }
}

// ── RSVP ─────────────────────────────────────────────────────────────────

export function getEventRsvp(eventId: number) {
	const db = getSocialDb();
	try {
		const counts = db.prepare(`
			SELECT status, COUNT(*) as count
			FROM event_rsvp
			WHERE event_id = ?
			GROUP BY status
		`).all(eventId) as Array<{ status: string; count: number }>;

		const attendees = db.prepare(`
			SELECT u.username, u.display_name, u.avatar_url, u.home_country, u.travel_style, r.status
			FROM event_rsvp r
			JOIN users u ON u.id = r.user_id
			WHERE r.event_id = ? AND r.status = 'going'
			ORDER BY r.created_at DESC
			LIMIT 20
		`).all(eventId);

		return { counts, attendees };
	} finally { db.close(); }
}

// ── Meetups ───────────────────────────────────────────────────────────────

export function getMeetups(opts: {
	cityId?: number;
	currentUserId?: number;
	limit?: number;
	offset?: number;
	upcoming?: boolean;
}) {
	const db = getSocialDb();
	const { cityId, currentUserId, limit = 20, offset = 0, upcoming = true } = opts;
	try {
		const now = Math.floor(Date.now() / 1000);
		const cityFilter = cityId ? `AND m.city_id = ${cityId}` : '';
		const dateFilter = upcoming ? `AND m.date_start >= ${now - 3600}` : '';

		const rows = db.prepare(`
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
		`).all(limit, offset) as Meetup[];

		for (const m of rows) {
			m.user_attending = Boolean(m.user_attending);
		}
		return rows;
	} finally { db.close(); }
}
