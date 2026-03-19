import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

let _db: Database.Database | null = null;

export function getDb() {
	if (!_db) {
		_db = new Database(DB_PATH);
		_db.pragma('journal_mode = WAL');
		_db.pragma('foreign_keys = ON');
	}
	return _db;
}

export { Database };
export const db = getDb();
