import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const POST = async ({ request }) => {
  try {
    const { email } = await request.json();
    const e = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return json({ error: "Valid email required" }, { status: 400 });
    }
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    try {
      db.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(e);
      return json({ success: true, message: "You're in! We'll send you weekly picks." });
    } finally {
      db.close();
    }
  } catch {
    return json({ error: "Failed to subscribe" }, { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-D30K6u8J.js.map
