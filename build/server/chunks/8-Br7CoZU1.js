import Database from 'better-sqlite3';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Diw6D3un.js')).default;
const server_id = "src/routes/submit/+page.server.ts";
const imports = ["_app/immutable/nodes/8.CPuK3YZL.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-Br7CoZU1.js.map
