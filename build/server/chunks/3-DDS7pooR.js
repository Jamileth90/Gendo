import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const load = async () => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const stats = {
      totalEvents: db.prepare("SELECT COUNT(*) as n FROM events WHERE status = ?").get("active").n,
      totalCities: db.prepare("SELECT COUNT(*) as n FROM cities").get().n,
      totalVenues: db.prepare("SELECT COUNT(*) as n FROM venues WHERE active = 1").get().n,
      pendingSubmissions: db.prepare("SELECT COUNT(*) as n FROM submitted_events WHERE status = ?").get("pending").n
    };
    const bySource = db.prepare(`
			SELECT source, COUNT(*) as n FROM events WHERE status = 'active'
			GROUP BY source ORDER BY n DESC
		`).all();
    const pending = db.prepare(`
			SELECT * FROM submitted_events WHERE status = 'pending'
			ORDER BY created_at DESC
		`).all();
    return { stats, bySource, pending };
  } finally {
    db.close();
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BOhSBaqk.js')).default;
const server_id = "src/routes/admin/+page.server.ts";
const imports = ["_app/immutable/nodes/3.CeEwExBm.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js","_app/immutable/chunks/DwFuaow-.js","_app/immutable/chunks/C0xfXwiF.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-DDS7pooR.js.map
