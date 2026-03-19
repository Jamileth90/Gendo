import { j as json } from './index-CoD1IJuy.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import Database from 'better-sqlite3';

const execAsync = promisify(exec);
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const SCRIPTS_DIR = join(process.cwd(), "scripts");
let scrapeRunning = false;
let lastScrapeAt = null;
let lastScrapeResult = null;
const GET = async () => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const total = db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get().n;
  const bySource = db.prepare(`SELECT source, COUNT(*) as n FROM events WHERE status='active' GROUP BY source ORDER BY n DESC`).all();
  const latest = db.prepare(`SELECT title, datetime(date_start,'unixepoch') as date, source FROM events WHERE status='active' ORDER BY created_at DESC LIMIT 10`).all();
  db.close();
  return json({
    scrapeRunning,
    lastScrapeAt: lastScrapeAt ? new Date(lastScrapeAt).toISOString() : null,
    lastScrapeResult,
    totalEvents: total,
    bySource,
    latestEvents: latest
  });
};
const POST = async ({ request }) => {
  if (scrapeRunning) {
    return json({ error: "Scraping already in progress" }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  const { city, source } = body;
  scrapeRunning = true;
  const startTime = Date.now();
  const db = new Database(DB_PATH);
  const beforeCount = db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get().n;
  db.close();
  const script = source === "meetup" ? "scrape-meetup.mjs" : "scrape-eventbrite.mjs";
  const args = city ? `"${city}"` : "";
  const cmd = `node ${join(SCRIPTS_DIR, script)} ${args}`;
  execAsync(cmd, { timeout: 20 * 60 * 1e3 }).then(() => {
    const db2 = new Database(DB_PATH);
    const afterCount = db2.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get().n;
    db2.close();
    lastScrapeAt = Date.now();
    lastScrapeResult = {
      added: afterCount - beforeCount,
      total: afterCount,
      duration: Math.round((Date.now() - startTime) / 1e3)
    };
    scrapeRunning = false;
  }).catch((e) => {
    console.error("Scrape error:", e.message);
    scrapeRunning = false;
  });
  return json({ started: true, script, city: city ?? "all cities" });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-CgIZaZ8F.js.map
