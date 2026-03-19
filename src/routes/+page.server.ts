import type { PageServerLoad } from './$types';
import Database from 'better-sqlite3';
import { cleanupPastEvents } from '$lib/db/cleanup';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RawEvent { [key: string]: unknown }

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface ScoredEvent {
	raw:     RawEvent;
	score:   number;
	reasons: string[];
}

// ── Franja horaria ────────────────────────────────────────────────────────────
function getTimeSlot(hour: number): TimeSlot {
	if (hour >= 5  && hour < 12) return 'morning';
	if (hour >= 12 && hour < 17) return 'afternoon';
	if (hour >= 17 && hour < 21) return 'evening';
	return 'night';
}

const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
	morning:   '🌅 Para esta mañana',
	afternoon: '☀️ Esta tarde',
	evening:   '🌆 Esta tarde-noche',
	night:     '🌙 Para esta noche',
};

// Bonus base por franja horaria
const TIME_BONUS: Record<TimeSlot, Record<string, number>> = {
	morning:   { yoga: 30, ciclismo: 25, sports: 12, food: 8,  pesca: 18 },
	afternoon: { food: 12, art: 10, sports: 10, festival: 8, cinema: 8 },
	evening:   { live_music: 22, food: 18, social: 20, festival: 14, theater: 12, comedy: 10 },
	night:     { social: 30, live_music: 24, comedy: 18, theater: 10 },
};

// ── Detección de persona (basada en preferencias acumuladas) ──────────────────
type Persona = 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral';

const PERSONA_CATS: Record<Persona, string[]> = {
	naturaleza: ['pesca', 'ciclismo', 'sports'],
	noche:      ['social', 'live_music', 'comedy'],
	cultura:    ['art', 'food', 'theater', 'cinema', 'festival', 'cultura', 'gastronomia'],
	zen:        ['yoga', 'art', 'cinema'],
	neutral:    [],
};

// Boost por tipo de evento/categoría cuando se detecta esa persona  (0–25 pts)
const PERSONA_BOOST: Record<Persona, Record<string, number>> = {
	naturaleza: { pesca: 25, ciclismo: 25, sports: 12 },
	noche:      { social: 25, live_music: 20, comedy: 15, theater: 10 },
	cultura:    { art: 22, food: 18, theater: 15, cinema: 12, festival: 10, cultura: 25, gastronomia: 20 },
	zen:        { yoga: 22, art: 14, cinema: 10 },
	neutral:    {},
};

// Boost extra cuando el VENUE pertenece a una categoría afín a la persona  (+20/+25 pts)
const VENUE_TYPE_BOOST: Record<Persona, Record<string, number>> = {
	naturaleza: { pesca: 25, ciclismo: 25, outdoor: 15, sports: 10 },
	noche:      { bar: 20, club: 20, nightclub: 18, stadium: 8 },
	cultura:    { cultura: 25, gastronomia: 20, theater: 18, restaurant: 12 },
	zen:        { outdoor: 18, cultura: 15 },
	neutral:    {},
};

/** Detecta la persona dominante a partir del mapa de preferencias */
function detectPersona(prefMap: Map<string, number>): Persona {
	const totals: Record<Persona, number> = { naturaleza: 0, noche: 0, cultura: 0, zen: 0, neutral: 0 };

	for (const [persona, cats] of Object.entries(PERSONA_CATS) as [Persona, string[]][]) {
		totals[persona] = cats.reduce((sum, cat) => sum + (prefMap.get(cat) ?? 0), 0);
	}

	// Umbral mínimo: necesita al menos 8 puntos para que la persona sea "activa"
	const best = (Object.entries(totals) as [Persona, number][])
		.filter(([p]) => p !== 'neutral')
		.sort((a, b) => b[1] - a[1])[0];

	return best && best[1] >= 8 ? best[0] : 'neutral';
}

// ── Estrella del Día: eventos semanales recurrentes ──────────────────────────
/**
 * Cada patrón describe un tipo de evento que ocurre una sola vez
 * por semana en días específicos (0 = domingo, 6 = sábado).
 * Si hoy coincide con uno de esos días Y el evento menciona el patrón,
 * recibe el tratamiento "Recomendación Estrella del Día".
 */
interface WeeklyPattern {
	regex:   RegExp;
	days:    number[];   // días de la semana esperados (0–6)
	label:   string;     // texto amigable para el badge
}

const WEEKLY_PATTERNS: WeeklyPattern[] = [
	{
		regex:  /farmer.?s?\s*market|growers?\s*market|mercado\s*de\s*granjeros|mercado\s*agr[ií]cola|mercado\s*del\s*agricultor/i,
		days:   [6, 0],   // sábado o domingo
		label:  '🌽 Mercado de Granjeros',
	},
	{
		regex:  /night\s*market|mercado\s*nocturno|noche\s*de\s*mercado/i,
		days:   [5, 6],   // viernes o sábado
		label:  '🌙 Mercado Nocturno',
	},
	{
		regex:  /sunday\s*market|mercado\s*dominical|sunday\s*bazaar|sunday\s*fair/i,
		days:   [0],       // domingo
		label:  '☀️ Mercado Dominical',
	},
	{
		regex:  /saturday\s*market|mercado\s*del\s*s[áa]bado|s[áa]bado\s*de\s*mercado/i,
		days:   [6],       // sábado
		label:  '🛒 Mercado del Sábado',
	},
	{
		regex:  /weekend\s*market|feria\s*de\s*fin\s*de\s*semana|weekend\s*fair|weekend\s*bazaar/i,
		days:   [6, 0],
		label:  '🎪 Feria de Fin de Semana',
	},
	{
		regex:  /flea\s*market|rastro|mercado\s*de\s*pulgas|swap\s*meet/i,
		days:   [6, 0],
		label:  '🏺 Mercado de Pulgas',
	},
	{
		regex:  /artisan\s*market|craft\s*market|mercado\s*artesanal|feria\s*artesanal/i,
		days:   [6, 0],
		label:  '🎨 Mercado Artesanal',
	},
	{
		regex:  /newbo\s*city\s*market|newbo\s*market/i,
		days:   [6],       // NewBo Cedar Rapids → sábados
		label:  '🏙️ NewBo City Market',
	},
];

/**
 * Devuelve el patrón semanal que coincide con el evento (si existe)
 * y si HOY es uno de los días esperados para ese evento.
 *
 * @param title       Título del evento o venue
 * @param description Descripción del evento (puede ser null)
 * @param eventDow    Día de la semana del evento (0–6)
 * @param todayDow    Día de la semana actual  (0–6)
 */
function matchWeeklyPattern(
	title:       string,
	description: string | null | undefined,
	eventDow:    number,
	todayDow:    number,
): WeeklyPattern | null {
	const haystack = `${title} ${description ?? ''}`;

	for (const pattern of WEEKLY_PATTERNS) {
		if (!pattern.regex.test(haystack)) continue;

		// El evento es hoy O el día del evento coincide con los días esperados del patrón
		const eventMatchesDay = pattern.days.includes(eventDow);
		const todayMatchesDay = pattern.days.includes(todayDow);

		if (eventMatchesDay && todayMatchesDay) return pattern;
	}
	return null;
}

// ── Función principal: getRecommendedEvents ───────────────────────────────────
/**
 * Toma eventos crudos de la BD y los puntúa con 7 señales:
 *   1. Preferencias personales del usuario (del historial de clics)
 *   2. Persona detectada (Naturaleza, Noche, Cultura, Zen)
 *   3. Tipo de venue afín a la persona
 *   4. Franja horaria actual
 *   5. Inmediatez del evento (hoy > mañana > próxima semana)
 *   6. Evento destacado
 *   7. ⭐ Estrella del Día: evento semanal recurrente que ocurre HOY
 *
 * El bonus de proximidad (< 5 km) se aplica en el cliente porque
 * requiere la ubicación del navegador.
 */
function getRecommendedEvents(
	rawEvents:   RawEvent[],
	prefMap:     Map<string, number>,
	timeSlot:    TimeSlot,
	nowTs:       number,
): ScoredEvent[] {
	const persona        = detectPersona(prefMap);
	const personaBoost   = PERSONA_BOOST[persona];
	const venueTypeBoost = VENUE_TYPE_BOOST[persona];

	const todayDow = new Date(nowTs * 1000).getDay();   // 0 = domingo, 6 = sábado

	const scored: ScoredEvent[] = rawEvents.map(e => {
		const type        = String(e['type']       ?? '');
		const venueType   = String(e['venue_type'] ?? '');
		const title       = String(e['title']       ?? '');
		const description = (e['description'] as string | null) ?? null;
		const dateStart   = Number(e['date_start']);
		const featured    = Boolean(e['featured']);
		const daysAway    = Math.max(0, (dateStart - nowTs) / 86400);
		const eventDow    = new Date(dateStart * 1000).getDay();
		const reasons:    string[] = [];
		let   score = 0;

		// ── 1. Preferencias personales (historial de clics) ──  (0–60 pts)
		const prefRaw   = prefMap.get(type) ?? 0;
		const prefBonus = Math.min(Math.round(Math.sqrt(prefRaw) * 12), 60);
		if (prefBonus > 0) { score += prefBonus; reasons.push('preference'); }

		// ── 2. Persona detectada (por tipo de evento) ─────────  (0–25 pts)
		const pBonus = personaBoost[type] ?? 0;
		if (pBonus > 0) { score += pBonus; reasons.push('persona'); }

		// ── 3. Venue afín a la persona ────────────────────────  (0–25 pts)
		const vBonus = venueTypeBoost[venueType] ?? 0;
		if (vBonus > 0) { score += vBonus; reasons.push('venue_match'); }

		// ── 4. Franja horaria ─────────────────────────────────  (0–30 pts)
		const tBonus = TIME_BONUS[timeSlot][type] ?? 0;
		if (tBonus > 0) { score += tBonus; reasons.push('time'); }

		// ── 5. Inmediatez ─────────────────────────────────────  (0–14 pts)
		score += Math.max(0, Math.round((7 - daysAway) * 2));

		// ── 6. Evento destacado ───────────────────────────────  +10 pts
		if (featured) { score += 10; reasons.push('featured'); }

		// ── 7. ⭐ Estrella del Día ────────────────────────────  +70 pts
		// Eventos semanales recurrentes (mercados, ferias) que ocurren HOY.
		// Garantiza que aparezcan al tope de la lista ese día específico.
		const weeklyMatch = matchWeeklyPattern(title, description, eventDow, todayDow);
		if (weeklyMatch) {
			score += 70;
			reasons.push('star_of_day');
			// Guardamos el label del patrón en el raw para que el mapper lo pueda pasar
			(e as Record<string, unknown>)['_star_label'] = weeklyMatch.label;
		}

		return { raw: e, score, reasons };
	});

	// Ordenar: mayor score primero; desempate por fecha más próxima
	scored.sort((a, b) =>
		b.score - a.score || Number(a.raw['date_start']) - Number(b.raw['date_start'])
	);

	return scored;
}

// ── Mapper raw DB row → objeto de la UI ──────────────────────────────────────
function mapEvent(e: RawEvent, score: number, reasons: string[]) {
	return {
		id:           e['id'] as number,
		title:        e['title'] as string,
		description:  e['description'] as string | null,
		dateStart:    (e['date_start'] as number) * 1000,
		type:         e['type'] as string,
		price:        e['price'] as string | null,
		priceAmount:  e['price_amount'] as number | null,
		currency:     e['currency'] as string | null,
		imageUrl:     e['image_url'] as string | null,
		tags:         e['tags'] as string | null,
		featured:     Boolean(e['featured']),
		venueName:    e['venue_name'] as string | null,
		venueAddress: e['address'] as string | null,
		venueType:    (e['venue_type']  as string | null) ?? null,
		isStarOfDay:  Boolean((e as Record<string, unknown>)['_star_label']),
		starLabel:    ((e as Record<string, unknown>)['_star_label'] as string | null) ?? null,
		// Coordenadas del venue — usadas por el bonus de proximidad en el cliente
		venueLat:     (e['venue_lat'] as number | null) ?? null,
		venueLng:     (e['venue_lng'] as number | null) ?? null,
		cityId:       e['city_id'] as number | null,
		cityName:     e['city_name'] as string | null,
		cityState:    e['state'] as string | null,
		cityCountry:  e['country'] as string | null,
		score,
		rankReasons: reasons,
	};
}

// ── Load ─────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ cookies }) => {
	// Limpieza automática: borrar eventos pasados (throttled a cada 6 h)
	cleanupPastEvents();

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	try {
		const now      = Math.floor(Date.now() / 1000);
		const hour     = new Date().getHours();
		const timeSlot = getTimeSlot(hour);

		// ── 1. Preferencias del usuario ───────────────────────────────────────
		const sessionId = cookies.get('gendo_anon') ?? '';
		const prefMap   = new Map<string, number>();

		if (sessionId) {
			const prefs = db.prepare(`
				SELECT category, click_count
				FROM user_preferences
				WHERE session_id = ?
				ORDER BY click_count DESC
			`).all(sessionId) as Array<{ category: string; click_count: number }>;

			for (const p of prefs) prefMap.set(p.category, p.click_count);
		}

		// ── 2. Eventos destacados ─────────────────────────────────────────────
		const featuredRaw = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.type,
				e.price, e.price_amount, e.currency, e.image_url, e.tags, e.featured,
				v.name as venue_name, v.address, v.type as venue_type,
				v.lat as venue_lat, v.lng as venue_lng,
				c.id as city_id, c.name as city_name, c.country, c.state
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE e.status = 'active' AND e.date_start >= ? AND e.featured = 1
			ORDER BY e.date_start ASC LIMIT 6
		`).all(now) as RawEvent[];

		// ── 3. Pool de eventos próximos (mayor del que necesitamos para ranking) ─
		const upcomingRaw = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.type,
				e.price, e.price_amount, e.currency, e.tags, e.featured,
				v.name as venue_name, v.address, v.type as venue_type,
				v.lat as venue_lat, v.lng as venue_lng,
				c.id as city_id, c.name as city_name, c.country, c.state
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE e.status = 'active' AND e.date_start >= ?
			ORDER BY e.date_start ASC LIMIT 120
		`).all(now) as RawEvent[];

		// ── 4. Aplicar getRecommendedEvents ───────────────────────────────────
		// Deduplicar raw por id y por clave semántica (title+date+venue) para evitar duplicados de distintas fuentes
		const upcomingDeduped: RawEvent[] = [];
		const rawSeen = new Set<number>();
		const rawKeys = new Set<string>();
		for (const e of upcomingRaw) {
			const id = e['id'] as number;
			if (rawSeen.has(id)) continue;
			const key = `${String(e['title'] ?? '').trim().toLowerCase()}|${e['date_start']}|${e['venue_id'] ?? 'null'}`;
			if (rawKeys.has(key)) continue;
			rawSeen.add(id);
			rawKeys.add(key);
			upcomingDeduped.push(e);
		}
		const featuredIds = new Set(featuredRaw.map((e) => e['id'] as number));
		const scored  = getRecommendedEvents(upcomingDeduped, prefMap, timeSlot, now);
		// Deduplicar por id y excluir los que ya están en featured
		const seen = new Set<number>();
		const upcoming = scored
			.filter(({ raw }) => {
				const id = raw['id'] as number;
				if (featuredIds.has(id) || seen.has(id)) return false;
				seen.add(id);
				return true;
			})
			.slice(0, 30)
			.map(({ raw, score, reasons }) => mapEvent(raw, score, reasons));

		// ── 5. Top 6 ciudades por estado/país (sin duplicar nombre+estado+país) ─────────────
		const citiesRaw = db.prepare(`
			SELECT c.id, c.name, c.country, c.country_code AS countryCode, c.state, c.lat, c.lng,
				COUNT(e.id) as event_count
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active' AND e.date_start >= ?
			GROUP BY c.id
			HAVING event_count > 0
			ORDER BY event_count DESC, c.name ASC
		`).all(now) as Array<{ id: number; name: string; country: string; countryCode: string; state: string | null; lat: number | null; lng: number | null; event_count: number }>;

		// Deduplicar en JS: una entrada por (name, countryCode, state), la de mayor event_count
		const citiesByKey = new Map<string, typeof citiesRaw[0]>();
		for (const c of citiesRaw) {
			const key = `${(c.name ?? '').trim().toLowerCase()}\0${(c.countryCode ?? '').trim().toUpperCase()}\0${(c.state ?? '').trim().toLowerCase()}`;
			const existing = citiesByKey.get(key);
			if (!existing || c.event_count > existing.event_count) citiesByKey.set(key, c);
		}
		const citiesUnique = Array.from(citiesByKey.values()).sort((a, b) => b.event_count - a.event_count);

		// Top 6 por partición (countryCode, state)
		const byPartition = new Map<string, typeof citiesUnique>();
		for (const c of citiesUnique) {
			const part = `${(c.countryCode ?? '').toUpperCase()}\0${(c.state ?? '').trim().toLowerCase()}`;
			const arr = byPartition.get(part) ?? [];
			if (arr.length < 6) arr.push(c);
			byPartition.set(part, arr);
		}
		let cities = Array.from(byPartition.values()).flat().sort((a, b) => b.event_count - a.event_count);

		// Filtro final: eliminar cualquier duplicado restante por (name, countryCode, state)
		const finalByKey = new Map<string, typeof cities[0]>();
		for (const c of cities) {
			const key = `${(c.name ?? '').trim().toLowerCase()}\0${(c.countryCode ?? '').trim().toUpperCase()}\0${(c.state ?? '').trim().toLowerCase()}`;
			const existing = finalByKey.get(key);
			if (!existing || (c.event_count > (existing.event_count ?? 0))) finalByKey.set(key, c);
		}
		cities = Array.from(finalByKey.values()).sort((a, b) => b.event_count - a.event_count);

		// ── 6. Stats ──────────────────────────────────────────────────────────
		const stats = db.prepare(`
			SELECT
				(SELECT COUNT(*) FROM events WHERE status='active' AND date_start >= ?) as total_events,
				(SELECT COUNT(*) FROM cities) as total_cities,
				(SELECT COUNT(*) FROM venues WHERE active=1) as total_venues
		`).get(now) as { total_events: number; total_cities: number; total_venues: number };

		// ── 7. Contexto de ranking para la UI ─────────────────────────────────
		const topUserCategories = [...prefMap.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([cat]) => cat);

		const persona = detectPersona(prefMap);

		// Deduplicar featured por id
		const featuredSeen = new Set<number>();
		const featured = featuredRaw
			.filter((e) => {
				const id = e['id'] as number;
				if (featuredSeen.has(id)) return false;
				featuredSeen.add(id);
				return true;
			})
			.map((e) => {
				const sc = getRecommendedEvents([e], prefMap, timeSlot, now)[0];
				return mapEvent(e, sc.score, sc.reasons);
			});

		return {
			featured,
			cities,
			upcoming,
			stats,
			rankingContext: {
				timeSlot,
				timeSlotLabel: TIME_SLOT_LABEL[timeSlot],
				hour,
				topUserCategories,
				hasPreferences: prefMap.size > 0,
				persona,  // 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral'
			},
		};
	} finally {
		db.close();
	}
};
