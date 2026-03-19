import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
import { g as getUserByToken } from "../../../../chunks/db.js";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const GET = async ({ cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ eventIds: [], isLoggedIn: false });
  const user = getUserByToken(token);
  if (!user) return json({ eventIds: [], isLoggedIn: false });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const rows = db.prepare(`
			SELECT event_id FROM user_saved_events WHERE user_id = ? ORDER BY created_at DESC
		`).all(user.id);
    return json({ eventIds: rows.map((r) => r.event_id), isLoggedIn: true });
  } finally {
    db.close();
  }
};
const POST = async ({ request, cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ error: "Sign in to save events" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return json({ error: "Invalid session" }, { status: 401 });
  const { eventId } = await request.json();
  if (!eventId || typeof eventId !== "number") return json({ error: "eventId required" }, { status: 400 });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    db.prepare(`
			INSERT OR IGNORE INTO user_saved_events (user_id, event_id) VALUES (?, ?)
		`).run(user.id, eventId);
    const rows = db.prepare(`SELECT event_id FROM user_saved_events WHERE user_id = ?`).all(user.id);
    return json({ eventIds: rows.map((r) => r.event_id) });
  } finally {
    db.close();
  }
};
const DELETE = async ({ request, cookies }) => {
  const token = cookies.get("gendo_session");
  if (!token) return json({ error: "Sign in to manage saved events" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return json({ error: "Invalid session" }, { status: 401 });
  const { eventId } = await request.json();
  if (!eventId || typeof eventId !== "number") return json({ error: "eventId required" }, { status: 400 });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    db.prepare(`DELETE FROM user_saved_events WHERE user_id = ? AND event_id = ?`).run(user.id, eventId);
    const rows = db.prepare(`SELECT event_id FROM user_saved_events WHERE user_id = ?`).all(user.id);
    return json({ eventIds: rows.map((r) => r.event_id) });
  } finally {
    db.close();
  }
};
export {
  DELETE,
  GET,
  POST
};
