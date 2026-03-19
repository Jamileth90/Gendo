/**
 * POST /api/refresh-all
 *
 * Actualiza TODOS los datos de Gendo desde múltiples fuentes:
 *   - Eventbrite (eventos de pago/gratis)
 *   - Meetup.com (grupos y eventos)
 *   - Apify: Facebook Events + Instagram (redes sociales)
 *   - Apify: Google Maps (restaurantes, teatros, bares, discotecas — vía discover)
 *
 * Ejecuta los scripts en secuencia en background. Responde inmediatamente.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';

const execAsync = promisify(exec);
const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';
const SCRIPTS_DIR = join(process.cwd(), 'scripts');
const ROOT_DIR = process.cwd();

let refreshRunning = false;
let lastRefreshAt: number | null = null;
let lastRefreshLog: string[] = [];

async function runScript(name: string): Promise<{ ok: boolean; msg: string }> {
	try {
		await execAsync(`node ${join(SCRIPTS_DIR, name)}`, {
			timeout: 25 * 60 * 1000,
			env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
		});
		return { ok: true, msg: `${name} completado` };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, msg: `${name}: ${msg.slice(0, 120)}` };
	}
}

async function runRefresh() {
	refreshRunning = true;
	lastRefreshLog = [];
	const db = new Database(DB_PATH);
	const before = (db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get() as { n: number }).n;
	db.close();

	// 1. Eventbrite
	lastRefreshLog.push('▶ Eventbrite...');
	const r1 = await runScript('scrape-eventbrite.mjs');
	lastRefreshLog.push(r1.ok ? `✅ ${r1.msg}` : `⚠️ ${r1.msg}`);

	// 2. Meetup
	lastRefreshLog.push('▶ Meetup.com...');
	const r2 = await runScript('scrape-meetup.mjs');
	lastRefreshLog.push(r2.ok ? `✅ ${r2.msg}` : `⚠️ ${r2.msg}`);

	// 3. Archivos locales: facebook-events.json e instagram.json
	if (existsSync(join(ROOT_DIR, 'facebook-events.json'))) {
		lastRefreshLog.push('▶ Facebook (facebook-events.json)...');
		const rFb = await runScript('import-facebook-events.mjs');
		lastRefreshLog.push(rFb.ok ? `✅ ${rFb.msg}` : `⚠️ ${rFb.msg}`);
	}

	if (existsSync(join(ROOT_DIR, 'instagram.json'))) {
		lastRefreshLog.push('▶ Instagram (instagram.json)...');
		const rIg = await runScript('import-instagram-from-json.mjs');
		lastRefreshLog.push(rIg.ok ? `✅ ${rIg.msg}` : `⚠️ ${rIg.msg}`);
	}

	// 4. Apify API: Facebook + Instagram (si tienes datasets en tu cuenta)
	lastRefreshLog.push('▶ Apify: Facebook e Instagram (API)...');
	const r3 = await runScript('import-apify-social.mjs');
	lastRefreshLog.push(r3.ok ? `✅ ${r3.msg}` : `⚠️ ${r3.msg}`);

	// 5. Cedar Rapids live (tourism, breweries, St. Patrick's, NewBo, etc.)
	lastRefreshLog.push('▶ Cedar Rapids (tourism, breweries, venues)...');
	const r4 = await runScript('scrape-cr-live.mjs');
	lastRefreshLog.push(r4.ok ? `✅ ${r4.msg}` : `⚠️ ${r4.msg}`);

	const db2 = new Database(DB_PATH);
	const after = (db2.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get() as { n: number }).n;
	const bySource = db2.prepare(
		`SELECT source, COUNT(*) as n FROM events WHERE status='active' GROUP BY source ORDER BY n DESC`
	).all() as { source: string; n: number }[];
	db2.close();

	lastRefreshAt = Date.now();
	lastRefreshLog.push(`📊 Total: ${after} eventos (+${after - before})`);
	bySource.forEach(s => lastRefreshLog.push(`   ${s.source}: ${s.n}`));
	refreshRunning = false;
}

export const GET: RequestHandler = async () => {
	const db = new Database(DB_PATH);
	const total = (db.prepare(`SELECT COUNT(*) as n FROM events WHERE status='active'`).get() as { n: number }).n;
	const bySource = db.prepare(
		`SELECT source, COUNT(*) as n FROM events WHERE status='active' GROUP BY source ORDER BY n DESC`
	).all() as { source: string; n: number }[];
	db.close();

	return json({
		refreshRunning,
		lastRefreshAt: lastRefreshAt ? new Date(lastRefreshAt).toISOString() : null,
		lastRefreshLog,
		totalEvents: total,
		bySource,
		sources: [
			{ id: 'eventbrite', name: 'Eventbrite', desc: 'Eventos y tickets' },
			{ id: 'meetup', name: 'Meetup.com', desc: 'Grupos y meetups' },
			{ id: 'facebook', name: 'Facebook Events', desc: 'facebook-events.json (tu archivo)' },
			{ id: 'instagram', name: 'Instagram', desc: 'instagram.json (tu archivo)' },
			{ id: 'apify_social', name: 'Apify API', desc: 'Facebook + Instagram desde tu cuenta' },
			{ id: 'cedar_rapids', name: 'Cedar Rapids', desc: 'Tourism, breweries, St. Patrick\'s, NewBo, Brucemore' },
			{ id: 'discovery_gps', name: 'Google Maps', desc: 'Restaurantes, bares, teatros (al abrir la app)' },
		],
	});
};

export const POST: RequestHandler = async () => {
	if (refreshRunning) {
		return json({ error: 'Actualización en curso', refreshRunning: true }, { status: 409 });
	}

	runRefresh().catch(e => {
		console.error('[refresh-all]', e);
		lastRefreshLog.push(`❌ Error: ${(e as Error).message}`);
		refreshRunning = false;
	});

	return json({
		started: true,
		message: 'Actualizando Eventbrite, Meetup, Facebook, Instagram y Cedar Rapids… puede tardar 10–20 min.',
		sources: ['Eventbrite', 'Meetup.com', 'Facebook Events', 'Instagram', 'Cedar Rapids'],
	});
};
