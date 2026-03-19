import { json } from "@sveltejs/kit";
import { randomBytes } from "crypto";
import Database from "better-sqlite3";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const ANON_COOKIE = "gendo_anon";
const ANON_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_CATEGORIES = /* @__PURE__ */ new Set([
  "pesca",
  "ciclismo",
  "yoga",
  "social",
  "live_music",
  "theater",
  "sports",
  "comedy",
  "festival",
  "food",
  "art",
  "cinema",
  "other"
]);
function getOrCreateSessionId(cookies) {
  let sid = cookies.get(ANON_COOKIE);
  if (!sid) {
    sid = randomBytes(16).toString("hex");
    cookies.set(ANON_COOKIE, sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: ANON_MAX_AGE
    });
  }
  return sid;
}
const POST = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const category = String(body.category ?? "").toLowerCase().trim();
  if (!VALID_CATEGORIES.has(category)) {
    return json({ error: "Categoría no válida" }, { status: 400 });
  }
  const sessionId = getOrCreateSessionId(cookies);
  let userId = null;
  const token = cookies.get("gendo_session");
  if (token) {
    const db2 = new Database(DB_PATH);
    try {
      const u = db2.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token);
      userId = u?.id ?? null;
    } finally {
      db2.close();
    }
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const now = Math.floor(Date.now() / 1e3);
    db.prepare(`
			INSERT INTO user_preferences (session_id, user_id, category, click_count, last_seen)
			VALUES (?, ?, ?, 1, ?)
			ON CONFLICT(session_id, category)
			DO UPDATE SET
				click_count = click_count + 1,
				last_seen   = excluded.last_seen,
				user_id     = COALESCE(excluded.user_id, user_id)
		`).run(sessionId, userId, category, now);
    const top = db.prepare(`
			SELECT category, click_count
			FROM user_preferences
			WHERE session_id = ?
			ORDER BY click_count DESC, last_seen DESC
			LIMIT 5
		`).all(sessionId);
    return json({ ok: true, top });
  } finally {
    db.close();
  }
};
const GET = async ({ cookies, url }) => {
  const sessionId = getOrCreateSessionId(cookies);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 20);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const prefs = db.prepare(`
			SELECT category, click_count, last_seen
			FROM user_preferences
			WHERE session_id = ?
			ORDER BY click_count DESC, last_seen DESC
			LIMIT ?
		`).all(sessionId, limit);
    const total = db.prepare(`
			SELECT SUM(click_count) as total FROM user_preferences WHERE session_id = ?
		`).get(sessionId).total ?? 0;
    return json({ prefs, total, sessionId: sessionId.slice(0, 8) + "…" });
  } finally {
    db.close();
  }
};
const DELETE = async ({ cookies }) => {
  const sessionId = cookies.get(ANON_COOKIE);
  if (!sessionId) return json({ ok: true, deleted: 0 });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const result = db.prepare(`DELETE FROM user_preferences WHERE session_id = ?`).run(sessionId);
    cookies.delete(ANON_COOKIE, { path: "/" });
    return json({ ok: true, deleted: result.changes });
  } finally {
    db.close();
  }
};
export {
  DELETE,
  GET,
  POST
};
