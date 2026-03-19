/**
 * classify.ts — Motor de clasificación bilingüe (ES + EN)
 *
 * Clasifica cualquier texto (nombre, descripción, hashtags, bio)
 * en una de las 4 categorías globales de Gendo:
 *
 *   🔵  agua    → Pesca / Playas / Surf / Water sports
 *   🟢  verde   → Parques / Ciclismo / Senderismo / Outdoor
 *   🟣  zen     → Yoga / Meditación / Bienestar / Wellness
 *   🟠  social  → Fiestas / Bares / Música / Eventos sociales
 *
 * Retorna null si el texto no encaja en ninguna categoría.
 */

export type GendoCategory = 'agua' | 'verde' | 'zen' | 'social';

// ── Diccionario bilingüe por categoría ───────────────────────────────────────
// Cada entrada es una regex de una línea (ES + EN). Sin flag `x`.

const PATTERNS: Array<{ cat: GendoCategory; re: RegExp }> = [

	// ── 🔵 AGUA: Pesca, Playas, Surf, Actividades acuáticas ──────────────────
	{
		cat: 'agua',
		re: /\b(pesca|pescando|pescar|pescador|pez|peces|playa|playas|surf|surfing|surfista|buceo|snorkel|snorkeling|kayak|kayaking|canoa|remo|velero|bote|lancha|marina|muelle|puerto|orilla|camar[oó]n|cangrejo|at[uú]n|mariscos|langosta|fish|fishing|fisherman|angling|angler|bass|trout|walleye|crappie|catfish|salmon|tuna|shrimp|lobster|crab|beach|beaches|wave|waves|diving|scuba|paddle|paddling|paddleboard|waterfront|lakeside|riverside|oceanfront|lago|laguna|rio|nadar|nado|nataci[oó]n|swim|swimming|pool|alberca)\b/i,
	},

	// ── 🟢 VERDE: Parques, Ciclismo, Senderismo, Naturaleza ──────────────────
	{
		cat: 'verde',
		re: /\b(bici|bicicleta|ciclismo|ciclista|ciclov[ií]a|cicloruta|parque|bosque|selva|jungla|campo|senderismo|caminata|trekking|excursi[oó]n|camino|sendero|monta[nñ]a|monta[nñ]ismo|escalada|cumbre|camping|campamento|acampar|carpa|fogata|naturaleza|ecolog[ií]a|sostenible|correr|running|trotar|trote|maraton|marat[oó]n|bike|biking|bicycle|cycling|cyclist|bikepath|park|parks|forest|jungle|trail|trails|hike|hiking|hiker|camp|campfire|mountain|climbing|summit|outdoor|outdoors|nature|green|run|runner|marathon|jogging|skate|skateboard|roller|scooter|longboard|greenway|pathway|bikeway|pedalear|chapultepec|alameda|jardin|jard[ií]n)\b/i,
	},

	// ── 🟣 ZEN: Yoga, Meditación, Bienestar, Wellness ────────────────────────
	{
		cat: 'zen',
		re: /\b(yoga|yogui|yogi|hatha|vinyasa|ashtanga|kundalini|meditaci[oó]n|meditar|mindfulness|consciencia|bienestar|salud|hol[ií]stico|espiritual|chakra|pilates|barre|stretching|estiramientos|flexibilidad|reiki|terapia|sanaci[oó]n|curaci[oó]n|spa|masaje|masajes|relajaci[oó]n|relajar|tai.?chi|qigong|breathwork|respiraci[oó]n|pranayama|namaste|karma|mantra|retiro|retreat|wellness|wellbeing|holistic|healing|therapy|therapist|meditation|meditate|mindful|massage|spiritual|relaxation|relax)\b/i,
	},

	// ── 🟠 SOCIAL: Fiestas, Bares, Música, Eventos Sociales ──────────────────
	{
		cat: 'social',
		re: /\b(fiesta|fiestas|party|parties|carnaval|bar|bares|cantina|pub|discoteca|disco|club|antro|cerveza|cervezas|cocktail|c[oó]ctel|trago|tragos|mezcal|tequila|ron|vino|brindis|happy.?hour|concierto|conciertos|banda|musica|m[uú]sica|karaoke|dj|baile|bailar|salsa|cumbia|reggaeton|evento|eventos|celebraci[oó]n|celebrar|mercado|feria|festival|verbena|noche|live.?music|concert|gig|band|show|nightlife|nightclub|dance|dancing|brewery|winery|social|gathering|meetup|hangout|fair|celebration|celebrate|comedy|standup|stand.?up|improv|rave|lounge|teatro|theater|theatre|opera|ballet|cine|cinema|museo|museum|galeria|gallery|arte|art|cultura|culture|exposici[oó]n|exhibition)\b/i,
	},
];

/**
 * Clasifica un texto en una categoría de Gendo.
 * @param texts  Uno o más textos a combinar (nombre, descripción, hashtags...)
 * @returns  La categoría detectada, o null si no hay coincidencia.
 */
export function classify(...texts: (string | null | undefined)[]): GendoCategory | null {
	const combined = texts
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');   // elimina acentos para matching más robusto

	for (const { cat, re } of PATTERNS) {
		if (re.test(combined)) return cat;
	}
	return null;
}

// ── Mapeo de categoría → tipo de evento en la BD ─────────────────────────────
export const CATEGORY_TO_TYPE: Record<GendoCategory, string> = {
	agua:   'pesca',
	verde:  'ciclismo',
	zen:    'yoga',
	social: 'social',
};

// Mapeo inverso: tipo de BD → categoría de color
export const TYPE_TO_CATEGORY: Record<string, GendoCategory> = {
	pesca:      'agua',
	playa:      'agua',
	ciclismo:   'verde',
	outdoor:    'verde',
	yoga:       'zen',
	social:     'social',
	live_music: 'social',
	comedy:     'social',
	festival:   'social',
	nightlife:  'social',
};

// ── Estilos visuales por categoría (Tailwind CSS) ─────────────────────────────
export const CATEGORY_STYLE: Record<GendoCategory, {
	emoji:   string;
	label:   string;
	badge:   string;
	active:  string;
	dot:     string;
	mapPin:  string;
}> = {
	agua: {
		emoji:  '🐟',
		label:  'Agua y Pesca',
		badge:  'bg-blue-500/15 text-blue-300 border border-blue-500/30',
		active: 'bg-blue-600 text-white',
		dot:    'bg-blue-400',
		mapPin: '#3b82f6',
	},
	verde: {
		emoji:  '🚲',
		label:  'Parques y Ciclismo',
		badge:  'bg-green-500/15 text-green-300 border border-green-500/30',
		active: 'bg-green-600 text-white',
		dot:    'bg-green-400',
		mapPin: '#22c55e',
	},
	zen: {
		emoji:  '🧘',
		label:  'Yoga y Bienestar',
		badge:  'bg-purple-500/15 text-purple-300 border border-purple-500/30',
		active: 'bg-purple-600 text-white',
		dot:    'bg-purple-400',
		mapPin: '#a855f7',
	},
	social: {
		emoji:  '🎉',
		label:  'Social y Eventos',
		badge:  'bg-orange-500/15 text-orange-300 border border-orange-500/30',
		active: 'bg-orange-500 text-white',
		dot:    'bg-orange-400',
		mapPin: '#f97316',
	},
};
