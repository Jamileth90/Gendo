/**
 * Auto-scrape scheduler — runs every 12 hours
 * Pulls fresh events from Eventbrite, Meetup, Facebook, Instagram y Apify
 */
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = join(ROOT, 'gendo.db');
const SCRIPTS_DIR = __dirname;

function log(msg) {
  const ts = new Date().toISOString().slice(0,19).replace('T',' ');
  console.log(`[${ts}] ${msg}`);
}

async function runScraper(scriptName) {
  log(`▶ Starting ${scriptName}...`);
  try {
    execSync(`node ${join(SCRIPTS_DIR, scriptName)}`, {
      stdio: 'inherit',
      timeout: 30 * 60 * 1000 // 30 min max
    });
    log(`✅ ${scriptName} done`);
  } catch (e) {
    log(`⚠️ ${scriptName} error: ${e.message}`);
  }
}

async function cleanOldEvents() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 7 * 24 * 3600; // 7 days old
  const result = db.prepare(`UPDATE events SET status='expired' WHERE date_start < ? AND status='active'`).run(cutoff);
  log(`🧹 Expired ${result.changes} old events`);
  db.close();
}

async function runAll() {
  log('🚀 Starting scheduled scraping cycle');
  await cleanOldEvents();
  await runScraper('scrape-eventbrite.mjs');
  await runScraper('scrape-meetup.mjs');
  if (existsSync(join(ROOT, 'facebook-events.json'))) {
    await runScraper('import-facebook-events.mjs');
  }
  if (existsSync(join(ROOT, 'instagram.json'))) {
    await runScraper('import-instagram-from-json.mjs');
  }
  await runScraper('import-apify-social.mjs');
  log('✅ Scraping cycle complete');
  
  const db = new Database(DB_PATH);
  const total = db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get();
  const bySource = db.prepare(`SELECT source, COUNT(*) as n FROM events WHERE status='active' GROUP BY source ORDER BY n DESC`).all();
  log(`📊 Total active events: ${total.n}`);
  bySource.forEach(r => log(`   ${r.source}: ${r.n}`));
  db.close();
}

const INTERVAL_HOURS = 12;
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

log(`⏰ Auto-scraper started — will run every ${INTERVAL_HOURS} hours`);
runAll(); // Run immediately

setInterval(() => {
  runAll();
}, INTERVAL_MS);
