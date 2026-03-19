import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
const PERSONA_CATS = {
  naturaleza: ["pesca", "ciclismo", "sports"],
  noche: ["social", "live_music", "comedy"],
  cultura: ["art", "food", "theater", "cinema", "festival"],
  zen: ["yoga", "art", "cinema"],
  neutral: []
};
function detectPersona(prefMap) {
  const totals = { naturaleza: 0, noche: 0, cultura: 0, zen: 0, neutral: 0 };
  for (const [persona, cats] of Object.entries(PERSONA_CATS)) {
    totals[persona] = cats.reduce((sum, cat) => sum + (prefMap.get(cat) ?? 0), 0);
  }
  const best = Object.entries(totals).filter(([p]) => p !== "neutral").sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 8 ? best[0] : "neutral";
}
const ACTIVITY_LABEL = {
  pesca: "spots de pesca",
  ciclismo: "rutas ciclistas y trails",
  yoga: "clases de yoga y bienestar",
  social: "bares y vida social",
  live_music: "música en vivo",
  food: "gastronomía local",
  art: "arte y exposiciones",
  sports: "eventos deportivos",
  festival: "festivales locales",
  theater: "teatro y espectáculos",
  comedy: "comedia y shows",
  cinema: "cine",
  other: "eventos locales"
};
const GET = async ({ url, cookies }) => {
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return json({ error: "lat y lng son requeridos" }, { status: 400 });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const cities = db.prepare(`
			SELECT id, name, country, state, lat, lng
			FROM cities
			WHERE lat IS NOT NULL AND lng IS NOT NULL
		`).all();
    if (cities.length === 0) {
      return json({ nearestCity: null, suggestions: [], distanceKm: null });
    }
    let nearestCity = cities[0];
    let minDist = haversineKm(lat, lng, cities[0].lat, cities[0].lng);
    for (const city of cities.slice(1)) {
      const d = haversineKm(lat, lng, city.lat, city.lng);
      if (d < minDist) {
        minDist = d;
        nearestCity = city;
      }
    }
    const sessionId = cookies.get("gendo_anon") ?? "";
    let topCategories = [];
    const prefMap = /* @__PURE__ */ new Map();
    if (sessionId) {
      const prefs = db.prepare(`
				SELECT category, click_count FROM user_preferences
				WHERE session_id = ?
				ORDER BY click_count DESC, last_seen DESC
			`).all(sessionId);
      for (const p of prefs) prefMap.set(p.category, p.click_count);
      topCategories = prefs.slice(0, 4).map((p) => p.category);
    }
    const persona = detectPersona(prefMap);
    if (topCategories.length === 0) {
      const popular = db.prepare(`
				SELECT type, COUNT(*) as n FROM events
				WHERE city_id = ? AND status = 'active'
				GROUP BY type ORDER BY n DESC LIMIT 3
			`).all(nearestCity.id);
      topCategories = popular.map((p) => p.type);
    }
    const now = Math.floor(Date.now() / 1e3);
    const placeholders = topCategories.map(() => "?").join(", ");
    const suggestions = topCategories.length > 0 ? db.prepare(`
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
			`).all(nearestCity.id, now, ...topCategories) : [];
    const contextMessages = topCategories.map((cat) => ({
      category: cat,
      activityLabel: ACTIVITY_LABEL[cat] ?? "actividades",
      count: suggestions.filter((s) => s["type"] === cat).length
    })).filter((c) => c.count > 0);
    return json({
      nearestCity: {
        id: nearestCity.id,
        name: nearestCity.name,
        country: nearestCity.country,
        state: nearestCity.state,
        lat: nearestCity.lat,
        lng: nearestCity.lng
      },
      distanceKm: Math.round(minDist),
      topCategories,
      persona,
      // 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral'
      hasPreferences: prefMap.size > 0,
      suggestions: suggestions.map((s) => ({
        id: s["id"],
        title: s["title"],
        type: s["type"],
        dateStart: s["date_start"] * 1e3,
        price: s["price"],
        priceAmount: s["price_amount"],
        sourceUrl: s["source_url"],
        imageUrl: s["image_url"],
        venueName: s["venue_name"],
        venueLat: s["venue_lat"],
        venueLng: s["venue_lng"]
      })),
      contextMessages
    });
  } finally {
    db.close();
  }
};
const POST = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const lat = parseFloat(String(body.lat ?? ""));
  const lng = parseFloat(String(body.lng ?? ""));
  if (isNaN(lat) || isNaN(lng)) {
    return json({ error: "lat y lng son requeridos" }, { status: 400 });
  }
  const token = cookies.get("gendo_session");
  if (token) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    try {
      db.prepare(`UPDATE users SET home_lat = ?, home_lng = ? WHERE session_token = ?`).run(lat, lng, token);
    } finally {
      db.close();
    }
  }
  return json({ ok: true, home: { lat, lng } });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-B-KEPDpC.js.map
