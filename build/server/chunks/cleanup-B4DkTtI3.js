import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const THROTTLE_HOURS = 6;
function cleanupPastEvents() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const now = Math.floor(Date.now() / 1e3);
    db.exec(`
			CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value INTEGER)
		`);
    const lastRun = db.prepare("SELECT value FROM _meta WHERE key = ?").get("last_cleanup");
    if (lastRun && now - lastRun.value < THROTTLE_HOURS * 3600) {
      return 0;
    }
    const result = db.prepare(`
			DELETE FROM events
			WHERE status = 'active'
			  AND COALESCE(date_end, date_start) < ?
		`).run(now);
    db.prepare(`
			INSERT INTO _meta (key, value) VALUES ('last_cleanup', ?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value
		`).run(now);
    return result.changes;
  } finally {
    db.close();
  }
}

export { cleanupPastEvents as c };
//# sourceMappingURL=cleanup-B4DkTtI3.js.map
