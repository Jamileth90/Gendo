/**
 * GET  /api/comments?eventId=X       — obtener comentarios de un evento
 * POST /api/comments                  — crear comentario
 * POST /api/comments?action=like&id=X — dar like
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all, get, run } from '$lib/db/client';
import { getEventComments, getUserByToken } from '$lib/social/db';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const eventId = Number(url.searchParams.get('eventId'));
	if (!eventId) return json({ error: 'eventId required' }, { status: 400 });

	const token = cookies.get('gendo_session');
	const currentUser = token ? await getUserByToken(token) : null;

	const comments = await getEventComments(eventId, currentUser?.id);
	return json({ comments, total: comments.length });
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Not logged in' }, { status: 401 });

	const user = await get<{ id: number }>(`SELECT * FROM users WHERE session_token = ?`, token);
	if (!user) return json({ error: 'Invalid session' }, { status: 401 });

	const action = url.searchParams.get('action');

	// Like/unlike a comment
	if (action === 'like') {
		const commentId = Number(url.searchParams.get('id'));
		if (!commentId) return json({ error: 'id required' }, { status: 400 });

		const existing = await get(`SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`, commentId, user.id);
		if (existing) {
			await run(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, commentId, user.id);
			const likesRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM comment_likes WHERE comment_id = ?`, commentId);
			return json({ ok: true, liked: false, likes: likesRow?.n ?? 0 });
		} else {
			await run(`INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, commentId, user.id);
			const likesRow = await get<{ n: number }>(`SELECT COUNT(*) as n FROM comment_likes WHERE comment_id = ?`, commentId);
			return json({ ok: true, liked: true, likes: likesRow?.n ?? 0 });
		}
	}

	// Create comment
	const body = await request.json().catch(() => ({}));
	const eventId = Number(body.eventId);
	const content = String(body.content ?? '').trim();
	const parentId = body.parentId ? Number(body.parentId) : null;

	if (!eventId || !content || content.length < 2) {
		return json({ error: 'eventId and content required' }, { status: 400 });
	}
	if (content.length > 2000) {
		return json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 });
	}

	const result = await run(`
		INSERT INTO event_comments (event_id, user_id, parent_id, content)
		VALUES (?, ?, ?, ?)
	`, eventId, user.id, parentId, content);

	const lastId = result.lastInsertRowid != null ? Number(result.lastInsertRowid) : 0;
	const comment = await get(`
		SELECT c.*, u.username, u.display_name, u.avatar_url, u.travel_style,
			0 as likes, 0 as user_liked
		FROM event_comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.id = ?
	`, lastId);

	return json({ ok: true, comment });
};

export const DELETE: RequestHandler = async ({ url, cookies }) => {
	const token = cookies.get('gendo_session');
	if (!token) return json({ error: 'Not logged in' }, { status: 401 });

	const commentId = Number(url.searchParams.get('id'));
	if (!commentId) return json({ error: 'id required' }, { status: 400 });

	const user = await get<{ id: number }>(`SELECT id FROM users WHERE session_token = ?`, token);
	if (!user) return json({ error: 'Invalid session' }, { status: 401 });

	await run(`DELETE FROM event_comments WHERE id = ? AND user_id = ?`, commentId, user.id);
	return json({ ok: true });
};
