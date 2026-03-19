/**
 * POST /api/refresh-cr
 *
 * Actualiza solo los eventos de Cedar Rapids (tourism, breweries, St. Patrick's, etc.).
 * Útil para ver en tiempo real qué está pasando hoy.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);
const SCRIPTS_DIR = join(process.cwd(), 'scripts');

let refreshCrRunning = false;

export const POST: RequestHandler = async () => {
	if (refreshCrRunning) {
		return json({ error: 'Cedar Rapids refresh already running', refreshRunning: true }, { status: 409 });
	}

	refreshCrRunning = true;
	execAsync(`node ${join(SCRIPTS_DIR, 'scrape-cr-live.mjs')}`, {
		timeout: 3 * 60 * 1000,
		env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
	})
		.then(() => {
			refreshCrRunning = false;
		})
		.catch(() => {
			refreshCrRunning = false;
		});

	return json({
		started: true,
		message: 'Actualizando eventos de Cedar Rapids… Recarga la página en 1–2 min.',
	});
};
