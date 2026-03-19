import { json } from "@sveltejs/kit";
import { a as getSocialDb, d as getEventRsvp } from "../../../../chunks/db.js";
const GET = async ({ url, cookies }) => {
  const eventId = Number(url.searchParams.get("eventId"));
  if (!eventId) return json({ error: "eventId required" }, { status: 400 });
  const token = cookies.get("gendo_session");
  const db = getSocialDb();
  try {
    const rsvp = getEventRsvp(eventId);
    let userStatus = null;
    if (token) {
      const user = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token);
      if (user) {
        const r = db.prepare(`SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?`).get(eventId, user.id);
        userStatus = r?.status ?? null;
      }
    }
    return json({ ...rsvp, userStatus });
  } finally {
    db.close();
  }
};
const POST = async ({ request, cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ error: "Not logged in" }, { status: 401 });
  const db = getSocialDb();
  try {
    const user = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token);
    if (!user) return json({ error: "Invalid session" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const eventId = Number(body.eventId);
    const status = body.status;
    if (!eventId || !["going", "interested", "not_going"].includes(status)) {
      return json({ error: "Invalid eventId or status" }, { status: 400 });
    }
    if (status === "not_going") {
      db.prepare(`DELETE FROM event_rsvp WHERE event_id = ? AND user_id = ?`).run(eventId, user.id);
    } else {
      db.prepare(`
				INSERT INTO event_rsvp (event_id, user_id, status)
				VALUES (?, ?, ?)
				ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status
			`).run(eventId, user.id, status);
    }
    const rsvp = getEventRsvp(eventId);
    return json({ ok: true, ...rsvp, userStatus: status === "not_going" ? null : status });
  } finally {
    db.close();
  }
};
export {
  GET,
  POST
};
