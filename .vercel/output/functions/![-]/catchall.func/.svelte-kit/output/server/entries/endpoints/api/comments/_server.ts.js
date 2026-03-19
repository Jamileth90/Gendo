import { json } from "@sveltejs/kit";
import { a as getSocialDb, g as getUserByToken, b as getEventComments } from "../../../../chunks/db.js";
const GET = async ({ url, cookies }) => {
  const eventId = Number(url.searchParams.get("eventId"));
  if (!eventId) return json({ error: "eventId required" }, { status: 400 });
  const token = cookies.get("gendo_session");
  const currentUser = token ? getUserByToken(token) : null;
  const comments = getEventComments(eventId, currentUser?.id);
  return json({ comments, total: comments.length });
};
const POST = async ({ request, url, cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ error: "Not logged in" }, { status: 401 });
  const db = getSocialDb();
  try {
    const user = db.prepare(`SELECT * FROM users WHERE session_token = ?`).get(token);
    if (!user) return json({ error: "Invalid session" }, { status: 401 });
    const action = url.searchParams.get("action");
    if (action === "like") {
      const commentId = Number(url.searchParams.get("id"));
      if (!commentId) return json({ error: "id required" }, { status: 400 });
      const existing = db.prepare(`SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`).get(commentId, user.id);
      if (existing) {
        db.prepare(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`).run(commentId, user.id);
        const likes = db.prepare(`SELECT COUNT(*) as n FROM comment_likes WHERE comment_id = ?`).get(commentId).n;
        return json({ ok: true, liked: false, likes });
      } else {
        db.prepare(`INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)`).run(commentId, user.id);
        const likes = db.prepare(`SELECT COUNT(*) as n FROM comment_likes WHERE comment_id = ?`).get(commentId).n;
        return json({ ok: true, liked: true, likes });
      }
    }
    const body = await request.json().catch(() => ({}));
    const eventId = Number(body.eventId);
    const content = String(body.content ?? "").trim();
    const parentId = body.parentId ? Number(body.parentId) : null;
    if (!eventId || !content || content.length < 2) {
      return json({ error: "eventId and content required" }, { status: 400 });
    }
    if (content.length > 2e3) {
      return json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });
    }
    const result = db.prepare(`
			INSERT INTO event_comments (event_id, user_id, parent_id, content)
			VALUES (?, ?, ?, ?)
		`).run(eventId, user.id, parentId, content);
    const comment = db.prepare(`
			SELECT c.*, u.username, u.display_name, u.avatar_url, u.travel_style,
				0 as likes, 0 as user_liked
			FROM event_comments c
			JOIN users u ON u.id = c.user_id
			WHERE c.id = ?
		`).get(result.lastInsertRowid);
    return json({ ok: true, comment });
  } finally {
    db.close();
  }
};
const DELETE = async ({ url, cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ error: "Not logged in" }, { status: 401 });
  const commentId = Number(url.searchParams.get("id"));
  if (!commentId) return json({ error: "id required" }, { status: 400 });
  const db = getSocialDb();
  try {
    const user = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token);
    if (!user) return json({ error: "Invalid session" }, { status: 401 });
    db.prepare(`DELETE FROM event_comments WHERE id = ? AND user_id = ?`).run(commentId, user.id);
    return json({ ok: true });
  } finally {
    db.close();
  }
};
export {
  DELETE,
  GET,
  POST
};
