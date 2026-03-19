/**
 * POST /api/preferences   — registra un clic en una categoría
 * GET  /api/preferences   — devuelve el top de categorías del usuario actual
 * DELETE /api/preferences — borra el historial del usuario actual
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import { all, get, run } from '$lib/db/client';

const ANON_COOKIE   = 'gendo_anon';
const ANON_MAX_AGE  = 60 * 60 * 24 * 365; // 1 año

/** Categorías válidas — evita que se inyecten valores arbitrarios */
const VALID_CATEGORIES = new Set([
	'pesca', 'ciclismo', 'yoga', 'social',
	'live_music', 'theater', 'sports', 'comedy',
	'festival', 'food', 'art', 'cinema', 'other',
]);

function getOrCreateSessionId(cookies: Cookies): string {
	let sid = cookies.get(ANON_COOKIE);
	if (!sid) {
		sid = randomBytes(16).toString('hex');
		cookies.set(ANON_COOKIE, sid, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: ANON_MAX_AGE,
		});
	}
	return sid;
}

// ── POST — registrar un clic ──────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const category = String(body.category ?? '').toLowerCase().trim();

	if (!VALID_CATEGORIES.has(category)) {
		return json({ error: 'Categoría no válida' }, { status: 400 });
	}

	const sessionId = getOrCreateSessionId(cookies);

	// Resuelve user_id si hay sesión de login
	let userId: number | null = null;
	const token = cookies.get('gendo_session');
	if (token) {
		const u = await get<{ id: number }>(`SELECT id FROM users WHERE session_token = ?`, token);
		userId = u?.id ?? null;
	}

	const now = Math.floor(Date.now() / 1000);

	// UPSERT: si ya existe esa categoría para esta sesión, incrementa el contador
	await run(`
		INSERT INTO user_preferences (session_id, user_id, category, click_count, last_seen)
		VALUES (?, ?, ?, 1, ?)
		ON CONFLICT(session_id, category)
		DO UPDATE SET
			click_count = click_count + 1,
			last_seen   = excluded.last_seen,
			user_id     = COALESCE(excluded.user_id, user_id)
	`, sessionId, userId, category, now);

	// Devuelve el top actualizado para feedback inmediato
	const top = await all<{ category: string; click_count: number }>(`
		SELECT category, click_count
		FROM user_preferences
		WHERE session_id = ?
		ORDER BY click_count DESC, last_seen DESC
		LIMIT 5
	`, sessionId);

	return json({ ok: true, top });
};

// ── GET — obtener preferencias del usuario actual ────────────────────────

export const GET: RequestHandler = async ({ cookies, url }) => {
	const sessionId = getOrCreateSessionId(cookies);
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 20);

	const prefs = await all<{ category: string; click_count: number; last_seen: number }>(`
		SELECT category, click_count, last_seen
		FROM user_preferences
		WHERE session_id = ?
		ORDER BY click_count DESC, last_seen DESC
		LIMIT ?
	`, sessionId, limit);

	const totalRow = await get<{ total: number | null }>(`
		SELECT SUM(click_count) as total FROM user_preferences WHERE session_id = ?
	`, sessionId);
	const total = totalRow?.total ?? 0;

	return json({ prefs, total, sessionId: sessionId.slice(0, 8) + '…' });
};

// ── DELETE — borrar historial ─────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get(ANON_COOKIE);
	if (!sessionId) return json({ ok: true, deleted: 0 });

	const result = await run(`DELETE FROM user_preferences WHERE session_id = ?`, sessionId);
	cookies.delete(ANON_COOKIE, { path: '/' });
	return json({ ok: true, deleted: result.changes });
};
