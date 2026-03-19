import { json } from "@sveltejs/kit";
import { g as getUserByToken, a as getSocialDb } from "../../../../chunks/db.js";
import { randomBytes } from "crypto";
const TRAVEL_STYLES = ["backpacker", "nomad", "solo_traveler", "traveler", "local", "expat"];
function makeAvatarUrl(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=128&bold=true`;
}
const POST = async ({ request, cookies, url }) => {
  const action = url.searchParams.get("action") ?? "join";
  if (action === "logout") {
    cookies.delete("gendo_session", { path: "/" });
    return json({ ok: true });
  }
  const db = getSocialDb();
  try {
    const existingToken = cookies.get("gendo_session");
    if (existingToken && action === "join") {
      const existing = db.prepare(`SELECT * FROM users WHERE session_token = ?`).get(existingToken);
      if (existing) return json({ ok: true, user: existing, alreadyLoggedIn: true });
    }
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    const displayName = String(body.displayName ?? body.display_name ?? username).trim().slice(0, 50);
    const bio = String(body.bio ?? "").trim().slice(0, 300);
    const homeCountry = String(body.homeCountry ?? body.home_country ?? "").trim().slice(0, 50);
    const travelStyle = TRAVEL_STYLES.includes(body.travelStyle ?? body.travel_style) ? body.travelStyle ?? body.travel_style : "traveler";
    if (!username || username.length < 3) {
      return json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    const taken = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    if (taken) {
      return json({ error: "Username already taken, try another" }, { status: 409 });
    }
    const token = randomBytes(32).toString("hex");
    const avatarUrl = body.avatarUrl ?? makeAvatarUrl(displayName || username);
    const result = db.prepare(`
			INSERT INTO users (username, display_name, avatar_url, bio, home_country, travel_style, session_token)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`).run(username, displayName, avatarUrl, bio, homeCountry, travelStyle, token);
    cookies.set("gendo_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90
      // 90 días
    });
    const user = db.prepare(`SELECT id, username, display_name, avatar_url, bio, home_country, travel_style, created_at FROM users WHERE id = ?`).get(result.lastInsertRowid);
    return json({ ok: true, user });
  } finally {
    db.close();
  }
};
const GET = async ({ cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ user: null });
  const user = getUserByToken(token);
  if (!user) {
    return json({ user: null });
  }
  const { ...safeUser } = user;
  delete safeUser["session_token"];
  return json({ user: safeUser });
};
export {
  GET,
  POST
};
