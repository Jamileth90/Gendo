/**
 * GET /api/events/for-you?lat=X&lng=Y
 *
 * Devuelve eventos personalizados para la ciudad más cercana a las coordenadas.
 * Usa preferencias del usuario (gendo_anon o user_id) para rankear.
 * Pensado para usuarios con cuenta que abren la app: detecta ciudad y muestra
 * eventos que les pueden gustar.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get } from '$lib/db/client';
import { getForYouEvents } from '$lib/events/for-you';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const lat = parseFloat(url.searchParams.get('lat') ?? '');
	const lng = parseFloat(url.searchParams.get('lng') ?? '');

	if (isNaN(lat) || isNaN(lng)) {
		return json({ error: 'lat y lng son requeridos' }, { status: 400 });
	}

	const sessionId = cookies.get('gendo_anon') ?? '';
	let userId: number | null = null;
	const token = cookies.get('gendo_session');
	if (token) {
		const u = await get<{ id: number }>(`SELECT id FROM users WHERE session_token = ?`, token);
		userId = u?.id ?? null;
	}

	const result = await getForYouEvents(lat, lng, sessionId, userId);
	return json(result);
};
