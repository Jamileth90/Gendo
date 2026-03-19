import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
function getSocialDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function getUserByToken(token) {
  const db = getSocialDb();
  try {
    return db.prepare(`SELECT * FROM users WHERE session_token = ?`).get(token);
  } finally {
    db.close();
  }
}
function getEventComments(eventId, currentUserId) {
  const db = getSocialDb();
  try {
    const rows = db.prepare(`
			SELECT
				c.*,
				u.username, u.display_name, u.avatar_url, u.travel_style,
				(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes,
				${currentUserId ? `(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId}) as user_liked` : `0 as user_liked`}
			FROM event_comments c
			JOIN users u ON u.id = c.user_id
			WHERE c.event_id = ? AND c.parent_id IS NULL
			ORDER BY c.created_at ASC
		`).all(eventId);
    for (const comment of rows) {
      comment.user_liked = Boolean(comment.user_liked);
      comment.replies = db.prepare(`
				SELECT
					c.*,
					u.username, u.display_name, u.avatar_url, u.travel_style,
					(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes,
					${currentUserId ? `(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId}) as user_liked` : `0 as user_liked`}
				FROM event_comments c
				JOIN users u ON u.id = c.user_id
				WHERE c.parent_id = ?
				ORDER BY c.created_at ASC
			`).all(comment.id);
      for (const r of comment.replies) r.user_liked = Boolean(r.user_liked);
    }
    return rows;
  } finally {
    db.close();
  }
}
function getEventRsvp(eventId) {
  const db = getSocialDb();
  try {
    const counts = db.prepare(`
			SELECT status, COUNT(*) as count
			FROM event_rsvp
			WHERE event_id = ?
			GROUP BY status
		`).all(eventId);
    const attendees = db.prepare(`
			SELECT u.username, u.display_name, u.avatar_url, u.home_country, u.travel_style, r.status
			FROM event_rsvp r
			JOIN users u ON u.id = r.user_id
			WHERE r.event_id = ? AND r.status = 'going'
			ORDER BY r.created_at DESC
			LIMIT 20
		`).all(eventId);
    return { counts, attendees };
  } finally {
    db.close();
  }
}
function getMeetups(opts) {
  const db = getSocialDb();
  const { cityId, currentUserId, limit = 20, offset = 0, upcoming = true } = opts;
  try {
    const now = Math.floor(Date.now() / 1e3);
    const cityFilter = cityId ? `AND m.city_id = ${cityId}` : "";
    const dateFilter = upcoming ? `AND m.date_start >= ${now - 3600}` : "";
    const rows = db.prepare(`
			SELECT
				m.*,
				u.username, u.display_name, u.avatar_url, u.travel_style, u.home_country,
				(SELECT COUNT(*) FROM meetup_attendees ma WHERE ma.meetup_id = m.id) as attendee_count,
				${currentUserId ? `(SELECT COUNT(*) FROM meetup_attendees ma WHERE ma.meetup_id = m.id AND ma.user_id = ${currentUserId}) as user_attending` : `0 as user_attending`}
			FROM meetups m
			JOIN users u ON u.id = m.user_id
			WHERE m.status = 'active'
			${cityFilter}
			${dateFilter}
			ORDER BY m.date_start ASC
			LIMIT ? OFFSET ?
		`).all(limit, offset);
    for (const m of rows) {
      m.user_attending = Boolean(m.user_attending);
    }
    return rows;
  } finally {
    db.close();
  }
}

export { getMeetups as a, getEventComments as b, getEventRsvp as c, getSocialDb as d, getUserByToken as g };
//# sourceMappingURL=db-B5QjczgJ.js.map
