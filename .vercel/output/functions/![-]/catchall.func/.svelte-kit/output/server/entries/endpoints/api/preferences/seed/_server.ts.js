import { json } from "@sveltejs/kit";
import { randomBytes } from "crypto";
import Database from "better-sqlite3";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const ANON_COOKIE = "gendo_anon";
const MAX_AGE = 60 * 60 * 24 * 365;
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
function getOrCreateSession(cookies) {
  let sid = cookies.get(ANON_COOKIE);
  if (!sid) {
    sid = randomBytes(16).toString("hex");
    cookies.set(ANON_COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });
  }
  return sid;
}
const POST = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const seeds = Array.isArray(body.seeds) ? body.seeds : [];
  const valid = seeds.filter(
    (s) => typeof s.category === "string" && VALID_CATEGORIES.has(s.category.toLowerCase()) && typeof s.weight === "number" && s.weight > 0 && s.weight <= 20
  );
  if (valid.length === 0) {
    return json({ error: "No hay seeds válidos" }, { status: 400 });
  }
  const sessionId = getOrCreateSession(cookies);
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
    const upsert = db.prepare(`
			INSERT INTO user_preferences (session_id, user_id, category, click_count, last_seen)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(session_id, category)
			DO UPDATE SET
				click_count = click_count + excluded.click_count,
				last_seen   = excluded.last_seen,
				user_id     = COALESCE(excluded.user_id, user_id)
		`);
    const runAll = db.transaction(() => {
      for (const s of valid) {
        upsert.run(sessionId, userId, s.category.toLowerCase(), s.weight, now);
      }
    });
    runAll();
    const prefs = db.prepare(`
			SELECT category, click_count
			FROM user_preferences
			WHERE session_id = ?
			ORDER BY click_count DESC
		`).all(sessionId);
    return json({ ok: true, seeded: valid.length, prefs });
  } finally {
    db.close();
  }
};
export {
  POST
};
