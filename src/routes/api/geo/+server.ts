/**
 * GET  /api/geo?lat=X&lng=Y              — ciudad más cercana + sugerencias explorador
 * POST /api/geo/home  (body: {lat,lng})  — guarda ubicación de casa del usuario logueado
 *
 * Lógica del Modo Explorador:
 *  1. Recibe lat/lng actuales del navegador
 *  2. Encuentra la ciudad más cercana en la DB usando Haversine en TypeScript
 *  3. Lee las preferencias del usuario (cookie gendo_anon) desde user_preferences
 *  4. Devuelve eventos en esa ciudad que coincidan con las categorías favoritas
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { all, get, run } from '$lib/db/client';

// ── Haversine ────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R   = 6371;
	const rad = Math.PI / 180;
	const dLat = (lat2 - lat1) * rad;
	const dLng = (lng2 - lng1) * rad;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Detección de persona (replica de +page.server.ts para ser autónomo) ───────
type Persona = 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral';

const PERSONA_CATS: Record<Persona, string[]> = {
	naturaleza: ['pesca', 'ciclismo', 'sports'],
	noche:      ['social', 'live_music', 'comedy'],
	cultura:    ['art', 'food', 'theater', 'cinema', 'festival'],
	zen:        ['yoga', 'art', 'cinema'],
	neutral:    [],
};

function detectPersona(prefMap: Map<string, number>): Persona {
	const totals: Record<Persona, number> = { naturaleza: 0, noche: 0, cultura: 0, zen: 0, neutral: 0 };
	for (const [persona, cats] of Object.entries(PERSONA_CATS) as [Persona, string[]][]) {
		totals[persona] = cats.reduce((sum, cat) => sum + (prefMap.get(cat) ?? 0), 0);
	}
	const best = (Object.entries(totals) as [Persona, number][])
		.filter(([p]) => p !== 'neutral')
		.sort((a, b) => b[1] - a[1])[0];
	return best && best[1] >= 8 ? best[0] : 'neutral';
}

// ── Descripciones de actividades por categoría (para el mensaje contextual) ──
const ACTIVITY_LABEL: Record<string, string> = {
	pesca:     'spots de pesca',
	ciclismo:  'rutas ciclistas y trails',
	yoga:      'clases de yoga y bienestar',
	social:    'bares y vida social',
	live_music:'música en vivo',
	food:      'gastronomía local',
	art:       'arte y exposiciones',
	sports:    'eventos deportivos',
	festival:  'festivales locales',
	theater:   'teatro y espectáculos',
	comedy:    'comedia y shows',
	cinema:    'cine',
	other:     'eventos locales',
};

// ── GET — explorar ciudad cercana ─────────────────────────────────────────────
export const GET: RequestHandler = async ({ url, cookies }) => {
	const lat = parseFloat(url.searchParams.get('lat') ?? '');
	const lng = parseFloat(url.searchParams.get('lng') ?? '');

	if (isNaN(lat) || isNaN(lng)) {
		return json({ error: 'lat y lng son requeridos' }, { status: 400 });
	}

	// 1. Cargar todas las ciudades con coordenadas (son pocas, < 100)
	const cities = await all<{ id: number; name: string; country: string; state: string | null; lat: number; lng: number }>(`
		SELECT id, name, country, state, lat, lng
		FROM cities
		WHERE lat IS NOT NULL AND lng IS NOT NULL
	`);

	if (cities.length === 0) {
		return json({ nearestCity: null, suggestions: [], distanceKm: null });
	}

	// 2. Encontrar la ciudad más cercana con Haversine
	let nearestCity = cities[0];
	let minDist = haversineKm(lat, lng, cities[0].lat, cities[0].lng);

	for (const city of cities.slice(1)) {
		const d = haversineKm(lat, lng, city.lat, city.lng);
		if (d < minDist) { minDist = d; nearestCity = city; }
	}

	// 3. Obtener preferencias completas + detectar persona
	const sessionId = cookies.get('gendo_anon') ?? '';
	let topCategories: string[] = [];
	const prefMap = new Map<string, number>();

	if (sessionId) {
		const prefs = await all<{ category: string; click_count: number }>(`
			SELECT category, click_count FROM user_preferences
			WHERE session_id = ?
			ORDER BY click_count DESC, last_seen DESC
		`, sessionId);

		for (const p of prefs) prefMap.set(p.category, p.click_count);
		topCategories = prefs.slice(0, 4).map(p => p.category);
	}

	const persona = detectPersona(prefMap);

	// Fallback: si no hay preferencias, usar categorías populares en esa ciudad
	if (topCategories.length === 0) {
		const popular = await all<{ type: string }>(`
			SELECT type, COUNT(*) as n FROM events
			WHERE city_id = ? AND status = 'active'
			GROUP BY type ORDER BY n DESC LIMIT 3
		`, nearestCity.id);
		topCategories = popular.map(p => p.type);
	}

	// 4. Buscar eventos en la ciudad cercana que coincidan con las categorías favoritas
	const now = Math.floor(Date.now() / 1000);
	const placeholders = topCategories.map(() => '?').join(', ');

	const suggestions = topCategories.length > 0
		? await all<Record<string, unknown>>(`
			SELECT e.id, e.title, e.type, e.date_start, e.price,
				e.price_amount, e.source_url, e.image_url,
				v.name  as venue_name,
				v.lat   as venue_lat,
				v.lng   as venue_lng
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ?
			  AND e.status = 'active'
			  AND e.date_start >= ?
			  AND e.type IN (${placeholders})
			ORDER BY e.featured DESC, e.date_start ASC
			LIMIT 6
		`, nearestCity.id, now, ...topCategories)
		: [];

	// 5. Construir mensajes contextuales por categoría
	const contextMessages = topCategories.map(cat => ({
		category: cat,
		activityLabel: ACTIVITY_LABEL[cat] ?? 'actividades',
		count: suggestions.filter(s => s['type'] === cat).length,
	})).filter(c => c.count > 0);

	return json({
		nearestCity: {
			id:      nearestCity.id,
			name:    nearestCity.name,
			country: nearestCity.country,
			state:   nearestCity.state,
			lat:     nearestCity.lat,
			lng:     nearestCity.lng,
		},
		distanceKm:      Math.round(minDist),
		topCategories,
		persona,          // 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral'
		hasPreferences:  prefMap.size > 0,
		suggestions: suggestions.map(s => ({
			id:         s['id'],
			title:      s['title'],
			type:       s['type'],
			dateStart:  (s['date_start'] as number) * 1000,
			price:      s['price'],
			priceAmount: s['price_amount'],
			sourceUrl:  s['source_url'],
			imageUrl:   s['image_url'],
			venueName:  s['venue_name'],
			venueLat:   s['venue_lat'],
			venueLng:   s['venue_lng'],
		})),
		contextMessages,
	});
};

// ── POST /api/geo — guardar ubicación de casa ─────────────────────────────────
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({})) as Record<string, unknown>;
	const lat = parseFloat(String(body.lat ?? ''));
	const lng = parseFloat(String(body.lng ?? ''));

	if (isNaN(lat) || isNaN(lng)) {
		return json({ error: 'lat y lng son requeridos' }, { status: 400 });
	}

	// Guardar en el perfil del usuario si está logueado
	const token = cookies.get('gendo_session');
	if (token) {
		await run(`UPDATE users SET home_lat = ?, home_lng = ? WHERE session_token = ?`, lat, lng, token);
	}

	// También lo devolvemos para que el frontend lo guarde en localStorage
	return json({ ok: true, home: { lat, lng } });
};
