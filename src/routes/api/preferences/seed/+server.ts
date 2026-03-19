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
import { all, get, run } from '$lib/db/client';
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
		const u = await get<{ id: number }>(`SELECT id FROM users WHERE session_token = ?`, token);
		userId = u?.id ?? null;
	}

	const now = Math.floor(Date.now() / 1000);

	// Upsert cada seed (reemplaza la transacción con un loop de run)
	for (const s of valid) {
		await run(`
			INSERT INTO user_preferences (session_id, user_id, category, click_count, last_seen)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(session_id, category)
			DO UPDATE SET
				click_count = click_count + excluded.click_count,
				last_seen   = excluded.last_seen,
				user_id     = COALESCE(excluded.user_id, user_id)
		`, sessionId, userId, s.category.toLowerCase(), s.weight, now);
	}

	// Devolver el estado actualizado
	const prefs = await all<{ category: string; click_count: number }>(`
		SELECT category, click_count
		FROM user_preferences
		WHERE session_id = ?
		ORDER BY click_count DESC
	`, sessionId);

	return json({ ok: true, seeded: valid.length, prefs });
};
