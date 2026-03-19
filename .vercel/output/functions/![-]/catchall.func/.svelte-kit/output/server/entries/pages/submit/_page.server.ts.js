import Database from "better-sqlite3";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const load = async () => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const cities = db.prepare(`
			SELECT id, name, state, country FROM cities
			ORDER BY name ASC LIMIT 200
		`).all();
    return { cities };
  } finally {
    db.close();
  }
};
export {
  load
};
