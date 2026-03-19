/**
 * Limpieza automática: borra eventos cuya fecha ya pasó.
 * Gendo debe verse siempre con información del futuro.
 */
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';
const THROTTLE_HOURS = 6;

export function cleanupPastEvents(): number {
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	try {
		const now = Math.floor(Date.now() / 1000);

		// Tabla para throttling: solo ejecutar cada THROTTLE_HOURS
		db.exec(`
			CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value INTEGER)
		`);
		const lastRun = db.prepare('SELECT value FROM _meta WHERE key = ?').get('last_cleanup') as { value: number } | undefined;
		if (lastRun && now - lastRun.value < THROTTLE_HOURS * 3600) {
			return 0;
		}

		// Borrar eventos cuya fecha de fin (o inicio si no hay fin) ya pasó
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
