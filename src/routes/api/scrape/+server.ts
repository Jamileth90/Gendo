import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { all, get } from '$lib/db/client';

const execAsync = promisify(exec);
const SCRIPTS_DIR = join(process.cwd(), 'scripts');

// Simple in-memory lock to avoid concurrent scraping
let scrapeRunning = false;
let lastScrapeAt: number | null = null;
let lastScrapeResult: { added: number; total: number; duration: number } | null = null;

export const GET: RequestHandler = async () => {
	const totalRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM events WHERE status='active'`);
	const total = totalRow?.n ?? 0;
	const bySource = await all<{ source: string; n: number }>(
		`SELECT source, COUNT(*) as n FROM events WHERE status='active' GROUP BY source ORDER BY n DESC`
	);
	const latest = await all<{ title: string; date: string; source: string }>(
		`SELECT title, datetime(date_start,'unixepoch') as date, source FROM events WHERE status='active' ORDER BY created_at DESC LIMIT 10`
	);

	return json({
		scrapeRunning,
		lastScrapeAt: lastScrapeAt ? new Date(lastScrapeAt).toISOString() : null,
		lastScrapeResult,
		totalEvents: total,
		bySource,
		latestEvents: latest
	});
};

export const POST: RequestHandler = async ({ request }) => {
	if (scrapeRunning) {
		return json({ error: 'Scraping already in progress' }, { status: 409 });
	}

	const body = await request.json().catch(() => ({})) as { city?: string; source?: string };
	const { city, source } = body;

	scrapeRunning = true;
	const startTime = Date.now();
	const beforeRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM events WHERE status='active'`);
	const beforeCount = beforeRow?.n ?? 0;

	// Run scraper in background
	const script = source === 'meetup' ? 'scrape-meetup.mjs' : 'scrape-eventbrite.mjs';
	const args = city ? `"${city}"` : '';
	const cmd = `node ${join(SCRIPTS_DIR, script)} ${args}`;

	execAsync(cmd, { timeout: 20 * 60 * 1000 })
		.then(async () => {
			const afterRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM events WHERE status='active'`);
			const afterCount = afterRow?.n ?? 0;

			lastScrapeAt = Date.now();
			lastScrapeResult = {
				added: afterCount - beforeCount,
				total: afterCount,
				duration: Math.round((Date.now() - startTime) / 1000)
			};
			scrapeRunning = false;
		})
		.catch((e: Error) => {
			console.error('Scrape error:', e.message);
			scrapeRunning = false;
		});

	return json({ started: true, script, city: city ?? 'all cities' });
};
