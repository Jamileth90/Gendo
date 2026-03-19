import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
import { b as private_env } from "../../../../chunks/shared-server.js";
const PATTERNS = [
  // ── 🔵 AGUA: Pesca, Playas, Surf, Actividades acuáticas ──────────────────
  {
    cat: "agua",
    re: /\b(pesca|pescando|pescar|pescador|pez|peces|playa|playas|surf|surfing|surfista|buceo|snorkel|snorkeling|kayak|kayaking|canoa|remo|velero|bote|lancha|marina|muelle|puerto|orilla|camar[oó]n|cangrejo|at[uú]n|mariscos|langosta|fish|fishing|fisherman|angling|angler|bass|trout|walleye|crappie|catfish|salmon|tuna|shrimp|lobster|crab|beach|beaches|wave|waves|diving|scuba|paddle|paddling|paddleboard|waterfront|lakeside|riverside|oceanfront|lago|laguna|rio|nadar|nado|nataci[oó]n|swim|swimming|pool|alberca)\b/i
  },
  // ── 🟢 VERDE: Parques, Ciclismo, Senderismo, Naturaleza ──────────────────
  {
    cat: "verde",
    re: /\b(bici|bicicleta|ciclismo|ciclista|ciclov[ií]a|cicloruta|parque|bosque|selva|jungla|campo|senderismo|caminata|trekking|excursi[oó]n|camino|sendero|monta[nñ]a|monta[nñ]ismo|escalada|cumbre|camping|campamento|acampar|carpa|fogata|naturaleza|ecolog[ií]a|sostenible|correr|running|trotar|trote|maraton|marat[oó]n|bike|biking|bicycle|cycling|cyclist|bikepath|park|parks|forest|jungle|trail|trails|hike|hiking|hiker|camp|campfire|mountain|climbing|summit|outdoor|outdoors|nature|green|run|runner|marathon|jogging|skate|skateboard|roller|scooter|longboard|greenway|pathway|bikeway|pedalear|chapultepec|alameda|jardin|jard[ií]n)\b/i
  },
  // ── 🟣 ZEN: Yoga, Meditación, Bienestar, Wellness ────────────────────────
  {
    cat: "zen",
    re: /\b(yoga|yogui|yogi|hatha|vinyasa|ashtanga|kundalini|meditaci[oó]n|meditar|mindfulness|consciencia|bienestar|salud|hol[ií]stico|espiritual|chakra|pilates|barre|stretching|estiramientos|flexibilidad|reiki|terapia|sanaci[oó]n|curaci[oó]n|spa|masaje|masajes|relajaci[oó]n|relajar|tai.?chi|qigong|breathwork|respiraci[oó]n|pranayama|namaste|karma|mantra|retiro|retreat|wellness|wellbeing|holistic|healing|therapy|therapist|meditation|meditate|mindful|massage|spiritual|relaxation|relax)\b/i
  },
  // ── 🟠 SOCIAL: Fiestas, Bares, Música, Eventos Sociales ──────────────────
  {
    cat: "social",
    re: /\b(fiesta|fiestas|party|parties|carnaval|bar|bares|cantina|pub|discoteca|disco|club|antro|cerveza|cervezas|cocktail|c[oó]ctel|trago|tragos|mezcal|tequila|ron|vino|brindis|happy.?hour|concierto|conciertos|banda|musica|m[uú]sica|karaoke|dj|baile|bailar|salsa|cumbia|reggaeton|evento|eventos|celebraci[oó]n|celebrar|mercado|feria|festival|verbena|noche|live.?music|concert|gig|band|show|nightlife|nightclub|dance|dancing|brewery|winery|social|gathering|meetup|hangout|fair|celebration|celebrate|comedy|standup|stand.?up|improv|rave|lounge|teatro|theater|theatre|opera|ballet|cine|cinema|museo|museum|galeria|gallery|arte|art|cultura|culture|exposici[oó]n|exhibition)\b/i
  }
];
function classify(...texts) {
  const combined = texts.filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const { cat, re } of PATTERNS) {
    if (re.test(combined)) return cat;
  }
  return null;
}
const CATEGORY_TO_TYPE = {
  agua: "pesca",
  verde: "ciclismo",
  zen: "yoga",
  social: "social"
};
const CATEGORY_STYLE = {
  agua: {
    emoji: "🐟",
    label: "Agua y Pesca",
    badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    active: "bg-blue-600 text-white",
    dot: "bg-blue-400",
    mapPin: "#3b82f6"
  },
  verde: {
    emoji: "🚲",
    label: "Parques y Ciclismo",
    badge: "bg-green-500/15 text-green-300 border border-green-500/30",
    active: "bg-green-600 text-white",
    dot: "bg-green-400",
    mapPin: "#22c55e"
  },
  zen: {
    emoji: "🧘",
    label: "Yoga y Bienestar",
    badge: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    active: "bg-purple-600 text-white",
    dot: "bg-purple-400",
    mapPin: "#a855f7"
  },
  social: {
    emoji: "🎉",
    label: "Social y Eventos",
    badge: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
    active: "bg-orange-500 text-white",
    dot: "bg-orange-400",
    mapPin: "#f97316"
  }
};
const DB_PATH = "./gendo.db";
const CACHE_TTL = 24 * 60 * 60;
const GEO_TTL = 7 * 24 * 60 * 60;
const ZONE_DEC = 2;
const GEO_DEC = 1;
const ACTOR_ID = "compass~crawler-google-places";
const MAX_PER_TERM = 9;
const MIN_RATING = 4;
const MIN_REVIEWS = 30;
const APIFY_WAIT = 120;
const EVENT_WINDOW = 7 * 24 * 60 * 60;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse?format=json";
const SEARCH_TERMS = [
  "parque naturaleza",
  "yoga bienestar spa",
  "pesca playa lago",
  "ciclismo bicicleta",
  "restaurantes bares comida",
  "teatro cine museo arte",
  "discoteca club noche bares",
  "eventos conciertos festival"
];
function zoneKey(lat, lng, dec = ZONE_DEC) {
  return `${lat.toFixed(dec)}|${lng.toFixed(dec)}`;
}
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
async function reverseGeocode(db, lat, lng) {
  const gLat = lat.toFixed(GEO_DEC);
  const gLng = lng.toFixed(GEO_DEC);
  const now = Math.floor(Date.now() / 1e3);
  const cached = db.prepare(
    `SELECT city, state, country, country_code FROM geocode_cache
		 WHERE lat_zone = ? AND lng_zone = ? AND (? - created_at) < ?`
  ).get(gLat, gLng, now, GEO_TTL);
  if (cached) {
    return { city: cached.city, state: cached.state, country: cached.country, countryCode: cached.country_code };
  }
  try {
    const res = await fetch(
      `${NOMINATIM_URL}&lat=${lat}&lon=${lng}&zoom=10`,
      // Nominatim usa 'lon', no 'lng'
      { headers: { "User-Agent": "Gendo-App/1.0 (contact@gendo.app)" } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Unknown";
      const state = addr.state ?? null;
      const country = addr.country ?? "Unknown";
      const countryCode = (addr.country_code ?? "XX").toUpperCase();
      db.prepare(`
				INSERT INTO geocode_cache (lat_zone, lng_zone, city, state, country, country_code, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(lat_zone, lng_zone) DO UPDATE SET
					city = excluded.city, state = excluded.state,
					country = excluded.country, country_code = excluded.country_code,
					created_at = excluded.created_at
			`).run(gLat, gLng, city, state, country, countryCode, now);
      return { city, state, country, countryCode };
    }
  } catch {
  }
  const nearest = db.prepare(
    `SELECT name, state, country, country_code FROM cities
		 WHERE lat IS NOT NULL AND lng IS NOT NULL
		 ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?))
		 LIMIT 1`
  ).get(lat, lat, lng, lng);
  if (nearest) return { city: nearest.name, state: nearest.state, country: nearest.country, countryCode: nearest.country_code };
  return { city: "Local", state: null, country: "Unknown", countryCode: "XX" };
}
function resolveCityId(db, geo, lat, lng) {
  const existing = db.prepare(
    `SELECT id FROM cities WHERE name = ? AND country_code = ? LIMIT 1`
  ).get(geo.city, geo.countryCode);
  if (existing) return existing.id;
  const nearby = db.prepare(
    `SELECT id, lat, lng FROM cities WHERE lat IS NOT NULL AND lng IS NOT NULL LIMIT 200`
  ).all();
  for (const c of nearby) {
    if (haversineKm(lat, lng, c.lat, c.lng) < 30) return c.id;
  }
  const res = db.prepare(`
		INSERT INTO cities (name, country, country_code, state, lat, lng)
		VALUES (?, ?, ?, ?, ?, ?)
	`).run(geo.city, geo.country, geo.countryCode, geo.state, lat, lng);
  return res.lastInsertRowid;
}
function upsertVenue(db, place, cityId) {
  const existing = db.prepare(
    `SELECT id FROM venues WHERE external_id = ? LIMIT 1`
  ).get(place.id);
  if (existing) {
    db.prepare(`
			UPDATE venues SET
				name    = ?, type = ?, address = ?,
				lat     = ?, lng  = ?,
				website = ?, phone = ?,
				city_id = ?,
				updated_at = strftime('%s','now')
			WHERE id = ?
		`).run(
      place.title,
      place.type,
      place.address,
      place.lat,
      place.lng,
      place.website,
      place.phone,
      cityId,
      existing.id
    );
    return existing.id;
  }
  const res = db.prepare(`
		INSERT INTO venues (city_id, name, type, address, lat, lng, website, phone, external_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
    cityId,
    place.title,
    place.type,
    place.address,
    place.lat,
    place.lng,
    place.website,
    place.phone,
    place.id
  );
  return res.lastInsertRowid;
}
function upsertRollingEvent(db, place, venueId, cityId) {
  const now = Math.floor(Date.now() / 1e3);
  const extId = `gps:${place.id}`;
  const existing = db.prepare(
    `SELECT id, date_start FROM events WHERE external_id = ? LIMIT 1`
  ).get(extId);
  if (existing) {
    db.prepare(`
			UPDATE events SET
				date_start = ?, date_end = ?,
				updated_at = strftime('%s','now')
			WHERE id = ?
		`).run(now, now + EVENT_WINDOW, existing.id);
    return "updated";
  }
  const tags = JSON.stringify([place.category, place.googleCat].filter(Boolean));
  const desc = [
    place.googleCat ? `Categoría: ${place.googleCat}` : null,
    place.rating ? `Rating Google Maps: ⭐ ${place.rating.toFixed(1)} (${place.reviews} reseñas)` : null,
    place.address ? `📍 ${place.address}` : null,
    place.website ? `🌐 ${place.website}` : null,
    place.phone ? `📞 ${place.phone}` : null
  ].filter(Boolean).join("\n");
  db.prepare(`
		INSERT INTO events
			(city_id, venue_id, title, type, date_start, date_end,
			 lat, lng, source, price, status, description, tags, external_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'discovery_gps', 'free', 'active', ?, ?, ?)
	`).run(
    cityId,
    venueId,
    place.title,
    place.type,
    now,
    now + EVENT_WINDOW,
    place.lat,
    place.lng,
    desc,
    tags,
    extId
  );
  return "created";
}
function buildSearchUrls(lat, lng) {
  return SEARCH_TERMS.map(
    (term) => `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},14z`
  );
}
async function runApifyScraper(lat, lng) {
  const token = private_env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN no configurado en .env");
  const input = {
    startUrls: buildSearchUrls(lat, lng).map((url) => ({ url })),
    maxCrawledPlacesPerSearch: MAX_PER_TERM,
    maxCrawledPlaces: MAX_PER_TERM * SEARCH_TERMS.length,
    exportPlaceUrls: false,
    deeperCityScrape: false,
    scrapeContacts: true,
    scrapeReviewsPersonalData: false
  };
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&waitForFinish=${APIFY_WAIT}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
  );
  if (!runRes.ok) {
    const txt = await runRes.text().catch(() => "");
    if (runRes.status === 402) {
      throw new Error("Apify está ocupado con otras búsquedas. Inténtalo en unos minutos.");
    }
    throw new Error(`Apify error ${runRes.status}: ${txt.slice(0, 200)}`);
  }
  const runData = await runRes.json();
  const datasetId = runData?.data?.defaultDatasetId;
  if (!datasetId) throw new Error("Apify no devolvió dataset ID");
  const dataRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=200`
  );
  if (!dataRes.ok) throw new Error(`Error al leer dataset Apify: ${dataRes.status}`);
  return await dataRes.json();
}
function filterAndClassify(items) {
  const results = [];
  for (const raw of items) {
    const item = raw;
    const rating = item.totalScore ?? item.stars ?? 0;
    const reviews = item.reviewsCount ?? item.userRatingsTotal ?? 0;
    if (rating > 0 && rating < MIN_RATING && reviews < MIN_REVIEWS) continue;
    if (rating === 0 && reviews < MIN_REVIEWS) continue;
    const title = (item.title ?? item.name ?? "").trim();
    const desc = (item.description ?? "").trim();
    const address = (item.address ?? "").trim();
    const googleCat = (item.categoryName ?? item.category ?? "").trim();
    if (!title) continue;
    const cat = classify(title, desc, address, googleCat);
    if (!cat) continue;
    const loc = item.location;
    results.push({
      id: item.placeId ?? item.id ?? `${title}|${address}`,
      title,
      category: cat,
      type: CATEGORY_TO_TYPE[cat],
      lat: loc?.lat ?? item.lat ?? null,
      lng: loc?.lng ?? item.lng ?? null,
      address,
      rating: rating || null,
      reviews,
      website: item.website ?? null,
      phone: item.phone ?? null,
      googleCat: googleCat || null,
      style: CATEGORY_STYLE[cat],
      source: "discovery"
    });
  }
  return results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}
async function persistToDb(db, places, lat, lng) {
  const stats = { citiesCreated: 0, venuesUpserted: 0, eventsUpserted: 0 };
  const geo = await reverseGeocode(db, lat, lng);
  const cityId = resolveCityId(db, geo, lat, lng);
  const cityCheck = db.prepare(`SELECT created_at FROM cities WHERE id = ?`).get(cityId);
  const isNewCity = cityCheck && Math.floor(Date.now() / 1e3) - cityCheck.created_at < 10;
  if (isNewCity) stats.citiesCreated++;
  const persist = db.transaction(() => {
    for (const place of places) {
      try {
        const venueId = upsertVenue(db, place, cityId);
        stats.venuesUpserted++;
        const status = upsertRollingEvent(db, place, venueId, cityId);
        if (status === "created" || status === "updated") stats.eventsUpserted++;
      } catch (e) {
        console.warn("[discover persist]", e.message?.slice(0, 80));
      }
    }
  });
  persist();
  return { ...stats, cityName: geo.city, countryCode: geo.countryCode };
}
function getDb() {
  const db = new Database(DB_PATH);
  db.exec(`
		CREATE TABLE IF NOT EXISTS discovery_cache (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			zone_key     TEXT    NOT NULL UNIQUE,
			results_json TEXT    NOT NULL,
			count        INTEGER NOT NULL DEFAULT 0,
			created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
		);
		CREATE INDEX IF NOT EXISTS idx_discovery_zone ON discovery_cache(zone_key);
		CREATE TABLE IF NOT EXISTS geocode_cache (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			lat_zone     TEXT    NOT NULL,
			lng_zone     TEXT    NOT NULL,
			city         TEXT    NOT NULL,
			state        TEXT,
			country      TEXT    NOT NULL,
			country_code TEXT    NOT NULL,
			created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
			UNIQUE(lat_zone, lng_zone)
		);
		CREATE INDEX IF NOT EXISTS idx_geocode_zone ON geocode_cache(lat_zone, lng_zone);
	`);
  return db;
}
async function discover(lat, lng) {
  const db = getDb();
  const key = zoneKey(lat, lng);
  const now = Math.floor(Date.now() / 1e3);
  const cached = db.prepare(
    `SELECT results_json, created_at FROM discovery_cache WHERE zone_key = ?`
  ).get(key);
  if (cached && now - cached.created_at < CACHE_TTL) {
    db.close();
    return {
      results: JSON.parse(cached.results_json),
      cached: true,
      cachedAt: cached.created_at * 1e3,
      zone: key,
      imported: null
    };
  }
  const rawItems = await runApifyScraper(lat, lng);
  const results = filterAndClassify(rawItems);
  const imported = await persistToDb(db, results, lat, lng);
  db.prepare(`
		INSERT INTO discovery_cache (zone_key, results_json, count, created_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(zone_key) DO UPDATE SET
			results_json = excluded.results_json,
			count        = excluded.count,
			created_at   = excluded.created_at
	`).run(key, JSON.stringify(results), results.length, now);
  db.close();
  return { results, cached: false, zone: key, imported };
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const lat = typeof body.lat === "number" ? body.lat : parseFloat(String(body.lat));
    const lng = typeof body.lng === "number" ? body.lng : parseFloat(String(body.lng));
    if (!isFinite(lat) || !isFinite(lng))
      return json({ error: "lat y lng deben ser números válidos" }, { status: 400 });
    const result = await discover(lat, lng);
    return json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[discover POST]", msg);
    return json({ error: msg, results: [] }, { status: 500 });
  }
};
const GET = async ({ url }) => {
  try {
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lng = parseFloat(url.searchParams.get("lng") ?? "");
    if (!isFinite(lat) || !isFinite(lng))
      return json({ error: "Parámetros lat y lng requeridos" }, { status: 400 });
    const result = await discover(lat, lng);
    return json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[discover GET]", msg);
    return json({ error: msg, results: [] }, { status: 500 });
  }
};
export {
  GET,
  POST
};
