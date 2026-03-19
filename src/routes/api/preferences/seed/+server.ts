/**
 * POST /api/preferences/seed
 * Siembra preferencias iniciales desde el onboarding.
 *
 * Body: { seeds: Array<{ category: string; weight: number }> }
 *
 * Usa ON CONFLICT ... DO UPDATE SET click_count = click_count + weight
 * para ser ADITIVO: nunca borra clics previos que el usuario ya tenía.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import Database from 'better-sqlite3';

const DB_PATH     = process.env.DATABASE_URL ?? './gendo.db';
const ANON_COOKIE = 'gendo_anon';
const MAX_AGE     = 60 * 60 * 24 * 365;

const VALID_CATEGORIES = new Set([
	'pesca', 'ciclismo', 'yoga', 'social',
	'live_music', 'theater', 'sports', 'comedy',
	'festival', 'food', 'art', 'cinema', 'other',
]);

function getOrCreateSession(cookies: Cookies): string {
	let sid = cookies.get(ANON_COOKIE);
	if (!sid) {
		sid = randomBytes(16).toString('hex');
		cookies.set(ANON_COOKIE, sid, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE });
	}
	return sid;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
	const seeds = Array.isArray(body.seeds) ? body.seeds as Array<{ category: string; weight: number }> : [];

	// Validar entradas
	const valid = seeds.filter(s =>
		typeof s.category === 'string' &&
		VALID_CATEGORIES.has(s.category.toLowerCase()) &&
		typeof s.weight === 'number' && s.weight > 0 && s.weight <= 20
	);

	if (valid.length === 0) {
		return json({ error: 'No hay seeds válidos' }, { status: 400 });
	}

	const sessionId = getOrCreateSession(cookies);

	// Resolver user_id si hay sesión de login
	let userId: number | null = null;
	const token = cookies.get('gendo_session');
	if (token) {
		const db = new Database(DB_PATH);
		try {
			const u = db.prepare(`SELECT id FROM users WHERE session_token = ?`).get(token) as { id: number } | null;
			userId = u?.id ?? null;
		} finally { db.close(); }
	}

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	try {
		const now  = Math.floor(Date.now() / 1000);

		// Transacción para insertar todos los seeds de golpe
		const upsert = db.prepare(`
			INSERT INTO user_preferences (session_id, user_id, category, click_count, last_seen)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(session_id, category)
			DO UPDATE SET
				click_count = click_count + excluded.click_count,
				last_seen   = excluded.last_seen,
				user_id     = COALESCE(excluded.user_id, user_id)
		`);

		const runAll = db.transaction(() => {
			for (const s of valid) {
				upsert.run(sessionId, userId, s.category.toLowerCase(), s.weight, now);
			}
		});
		runAll();

		// Devolver el estado actualizado
		const prefs = db.prepare(`
			SELECT category, click_count
			FROM user_preferences
			WHERE session_id = ?
			ORDER BY click_count DESC
		`).all(sessionId) as Array<{ category: string; click_count: number }>;

		return json({ ok: true, seeded: valid.length, prefs });
	} finally {
		db.close();
	}
};
