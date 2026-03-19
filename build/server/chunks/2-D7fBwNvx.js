import Database from 'better-sqlite3';
import { c as cleanupPastEvents } from './cleanup-B4DkTtI3.js';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
function getTimeSlot(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
const TIME_SLOT_LABEL = {
  morning: "🌅 Para esta mañana",
  afternoon: "☀️ Esta tarde",
  evening: "🌆 Esta tarde-noche",
  night: "🌙 Para esta noche"
};
const TIME_BONUS = {
  morning: { yoga: 30, ciclismo: 25, sports: 12, food: 8, pesca: 18 },
  afternoon: { food: 12, art: 10, sports: 10, festival: 8, cinema: 8 },
  evening: { live_music: 22, food: 18, social: 20, festival: 14, theater: 12, comedy: 10 },
  night: { social: 30, live_music: 24, comedy: 18, theater: 10 }
};
const PERSONA_CATS = {
  naturaleza: ["pesca", "ciclismo", "sports"],
  noche: ["social", "live_music", "comedy"],
  cultura: ["art", "food", "theater", "cinema", "festival", "cultura", "gastronomia"],
  zen: ["yoga", "art", "cinema"],
  neutral: []
};
const PERSONA_BOOST = {
  naturaleza: { pesca: 25, ciclismo: 25, sports: 12 },
  noche: { social: 25, live_music: 20, comedy: 15, theater: 10 },
  cultura: { art: 22, food: 18, theater: 15, cinema: 12, festival: 10, cultura: 25, gastronomia: 20 },
  zen: { yoga: 22, art: 14, cinema: 10 },
  neutral: {}
};
const VENUE_TYPE_BOOST = {
  naturaleza: { pesca: 25, ciclismo: 25, outdoor: 15, sports: 10 },
  noche: { bar: 20, club: 20, nightclub: 18, stadium: 8 },
  cultura: { cultura: 25, gastronomia: 20, theater: 18, restaurant: 12 },
  zen: { outdoor: 18, cultura: 15 },
  neutral: {}
};
function detectPersona(prefMap) {
  const totals = { naturaleza: 0, noche: 0, cultura: 0, zen: 0, neutral: 0 };
  for (const [persona, cats] of Object.entries(PERSONA_CATS)) {
    totals[persona] = cats.reduce((sum, cat) => sum + (prefMap.get(cat) ?? 0), 0);
  }
  const best = Object.entries(totals).filter(([p]) => p !== "neutral").sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 8 ? best[0] : "neutral";
}
const WEEKLY_PATTERNS = [
  {
    regex: /farmer.?s?\s*market|growers?\s*market|mercado\s*de\s*granjeros|mercado\s*agr[ií]cola|mercado\s*del\s*agricultor/i,
    days: [6, 0],
    // sábado o domingo
    label: "🌽 Mercado de Granjeros"
  },
  {
    regex: /night\s*market|mercado\s*nocturno|noche\s*de\s*mercado/i,
    days: [5, 6],
    // viernes o sábado
    label: "🌙 Mercado Nocturno"
  },
  {
    regex: /sunday\s*market|mercado\s*dominical|sunday\s*bazaar|sunday\s*fair/i,
    days: [0],
    // domingo
    label: "☀️ Mercado Dominical"
  },
  {
    regex: /saturday\s*market|mercado\s*del\s*s[áa]bado|s[áa]bado\s*de\s*mercado/i,
    days: [6],
    // sábado
    label: "🛒 Mercado del Sábado"
  },
  {
    regex: /weekend\s*market|feria\s*de\s*fin\s*de\s*semana|weekend\s*fair|weekend\s*bazaar/i,
    days: [6, 0],
    label: "🎪 Feria de Fin de Semana"
  },
  {
    regex: /flea\s*market|rastro|mercado\s*de\s*pulgas|swap\s*meet/i,
    days: [6, 0],
    label: "🏺 Mercado de Pulgas"
  },
  {
    regex: /artisan\s*market|craft\s*market|mercado\s*artesanal|feria\s*artesanal/i,
    days: [6, 0],
    label: "🎨 Mercado Artesanal"
  },
  {
    regex: /newbo\s*city\s*market|newbo\s*market/i,
    days: [6],
    // NewBo Cedar Rapids → sábados
    label: "🏙️ NewBo City Market"
  }
];
function matchWeeklyPattern(title, description, eventDow, todayDow) {
  const haystack = `${title} ${description ?? ""}`;
  for (const pattern of WEEKLY_PATTERNS) {
    if (!pattern.regex.test(haystack)) continue;
    const eventMatchesDay = pattern.days.includes(eventDow);
    const todayMatchesDay = pattern.days.includes(todayDow);
    if (eventMatchesDay && todayMatchesDay) return pattern;
  }
  return null;
}
function getRecommendedEvents(rawEvents, prefMap, timeSlot, nowTs) {
  const persona = detectPersona(prefMap);
  const personaBoost = PERSONA_BOOST[persona];
  const venueTypeBoost = VENUE_TYPE_BOOST[persona];
  const todayDow = new Date(nowTs * 1e3).getDay();
  const scored = rawEvents.map((e) => {
    const type = String(e["type"] ?? "");
    const venueType = String(e["venue_type"] ?? "");
    const title = String(e["title"] ?? "");
    const description = e["description"] ?? null;
    const dateStart = Number(e["date_start"]);
    const featured = Boolean(e["featured"]);
    const daysAway = Math.max(0, (dateStart - nowTs) / 86400);
    const eventDow = new Date(dateStart * 1e3).getDay();
    const reasons = [];
    let score = 0;
    const prefRaw = prefMap.get(type) ?? 0;
    const prefBonus = Math.min(Math.round(Math.sqrt(prefRaw) * 12), 60);
    if (prefBonus > 0) {
      score += prefBonus;
      reasons.push("preference");
    }
    const pBonus = personaBoost[type] ?? 0;
    if (pBonus > 0) {
      score += pBonus;
      reasons.push("persona");
    }
    const vBonus = venueTypeBoost[venueType] ?? 0;
    if (vBonus > 0) {
      score += vBonus;
      reasons.push("venue_match");
    }
    const tBonus = TIME_BONUS[timeSlot][type] ?? 0;
    if (tBonus > 0) {
      score += tBonus;
      reasons.push("time");
    }
    score += Math.max(0, Math.round((7 - daysAway) * 2));
    if (featured) {
      score += 10;
      reasons.push("featured");
    }
    const weeklyMatch = matchWeeklyPattern(title, description, eventDow, todayDow);
    if (weeklyMatch) {
      score += 70;
      reasons.push("star_of_day");
      e["_star_label"] = weeklyMatch.label;
    }
    return { raw: e, score, reasons };
  });
  scored.sort(
    (a, b) => b.score - a.score || Number(a.raw["date_start"]) - Number(b.raw["date_start"])
  );
  return scored;
}
function mapEvent(e, score, reasons) {
  return {
    id: e["id"],
    title: e["title"],
    description: e["description"],
    dateStart: e["date_start"] * 1e3,
    type: e["type"],
    price: e["price"],
    priceAmount: e["price_amount"],
    currency: e["currency"],
    imageUrl: e["image_url"],
    tags: e["tags"],
    featured: Boolean(e["featured"]),
    venueName: e["venue_name"],
    venueAddress: e["address"],
    venueType: e["venue_type"] ?? null,
    isStarOfDay: Boolean(e["_star_label"]),
    starLabel: e["_star_label"] ?? null,
    // Coordenadas del venue — usadas por el bonus de proximidad en el cliente
    venueLat: e["venue_lat"] ?? null,
    venueLng: e["venue_lng"] ?? null,
    cityId: e["city_id"],
    cityName: e["city_name"],
    cityState: e["state"],
    cityCountry: e["country"],
    score,
    rankReasons: reasons
  };
}
const load = async ({ cookies }) => {
  cleanupPastEvents();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const now = Math.floor(Date.now() / 1e3);
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const timeSlot = getTimeSlot(hour);
    const sessionId = cookies.get("gendo_anon") ?? "";
    const prefMap = /* @__PURE__ */ new Map();
    if (sessionId) {
      const prefs = db.prepare(`
				SELECT category, click_count
				FROM user_preferences
				WHERE session_id = ?
				ORDER BY click_count DESC
			`).all(sessionId);
      for (const p of prefs) prefMap.set(p.category, p.click_count);
    }
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
		`).all(now);
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
		`).all(now);
    const upcomingDeduped = [];
    const rawSeen = /* @__PURE__ */ new Set();
    const rawKeys = /* @__PURE__ */ new Set();
    for (const e of upcomingRaw) {
      const id = e["id"];
      if (rawSeen.has(id)) continue;
      const key = `${String(e["title"] ?? "").trim().toLowerCase()}|${e["date_start"]}|${e["venue_id"] ?? "null"}`;
      if (rawKeys.has(key)) continue;
      rawSeen.add(id);
      rawKeys.add(key);
      upcomingDeduped.push(e);
    }
    const featuredIds = new Set(featuredRaw.map((e) => e["id"]));
    const scored = getRecommendedEvents(upcomingDeduped, prefMap, timeSlot, now);
    const seen = /* @__PURE__ */ new Set();
    const upcoming = scored.filter(({ raw }) => {
      const id = raw["id"];
      if (featuredIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 30).map(({ raw, score, reasons }) => mapEvent(raw, score, reasons));
    const citiesRaw = db.prepare(`
			SELECT c.id, c.name, c.country, c.country_code AS countryCode, c.state, c.lat, c.lng,
				COUNT(e.id) as event_count
			FROM cities c
			LEFT JOIN events e ON e.city_id = c.id AND e.status = 'active' AND e.date_start >= ?
			GROUP BY c.id
			HAVING event_count > 0
			ORDER BY event_count DESC, c.name ASC
		`).all(now);
    const citiesByKey = /* @__PURE__ */ new Map();
    for (const c of citiesRaw) {
      const key = `${(c.name ?? "").trim().toLowerCase()}\0${(c.countryCode ?? "").trim().toUpperCase()}\0${(c.state ?? "").trim().toLowerCase()}`;
      const existing = citiesByKey.get(key);
      if (!existing || c.event_count > existing.event_count) citiesByKey.set(key, c);
    }
    const citiesUnique = Array.from(citiesByKey.values()).sort((a, b) => b.event_count - a.event_count);
    const byPartition = /* @__PURE__ */ new Map();
    for (const c of citiesUnique) {
      const part = `${(c.countryCode ?? "").toUpperCase()}\0${(c.state ?? "").trim().toLowerCase()}`;
      const arr = byPartition.get(part) ?? [];
      if (arr.length < 6) arr.push(c);
      byPartition.set(part, arr);
    }
    let cities = Array.from(byPartition.values()).flat().sort((a, b) => b.event_count - a.event_count);
    const finalByKey = /* @__PURE__ */ new Map();
    for (const c of cities) {
      const key = `${(c.name ?? "").trim().toLowerCase()}\0${(c.countryCode ?? "").trim().toUpperCase()}\0${(c.state ?? "").trim().toLowerCase()}`;
      const existing = finalByKey.get(key);
      if (!existing || c.event_count > (existing.event_count ?? 0)) finalByKey.set(key, c);
    }
    cities = Array.from(finalByKey.values()).sort((a, b) => b.event_count - a.event_count);
    const stats = db.prepare(`
			SELECT
				(SELECT COUNT(*) FROM events WHERE status='active' AND date_start >= ?) as total_events,
				(SELECT COUNT(*) FROM cities) as total_cities,
				(SELECT COUNT(*) FROM venues WHERE active=1) as total_venues
		`).get(now);
    const topUserCategories = [...prefMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat]) => cat);
    const persona = detectPersona(prefMap);
    const featuredSeen = /* @__PURE__ */ new Set();
    const featured = featuredRaw.filter((e) => {
      const id = e["id"];
      if (featuredSeen.has(id)) return false;
      featuredSeen.add(id);
      return true;
    }).map((e) => {
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
        persona
        // 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral'
      }
    };
  } finally {
    db.close();
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BGFxmxs0.js')).default;
const server_id = "src/routes/+page.server.ts";
const imports = ["_app/immutable/nodes/2.DFDgRCKB.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js","_app/immutable/chunks/D9rTjJqw.js","_app/immutable/chunks/DwFuaow-.js","_app/immutable/chunks/C9-fO4Nh.js","_app/immutable/chunks/C0xfXwiF.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/BVFbnQIw.js","_app/immutable/chunks/D5KUf6On.js","_app/immutable/chunks/C1Uq0Uby.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-D7fBwNvx.js.map
