import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { g as getUserByToken, c as getMeetups } from "../../../../chunks/db.js";
import { c as cleanupPastEvents } from "../../../../chunks/cleanup.js";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const load = async ({ params, cookies }) => {
  cleanupPastEvents();
  const slug = params.slug.replace(/-/g, " ");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const city = db.prepare(`SELECT id, name, country, country_code AS countryCode, state, lat, lng FROM cities WHERE name LIKE ? LIMIT 1`).get(`%${slug}%`);
    if (!city) throw error(404, `City "${slug}" not found`);
    const now = Math.floor(Date.now() / 1e3);
    const eventsRaw = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.date_end,
				e.type, e.price, e.price_amount, e.currency,
				e.source_url, e.image_url, e.featured, e.tags, e.source,
				v.id as venue_id, v.name as venue_name, v.type as venue_type,
				v.address, v.lat as v_lat, v.lng as v_lng,
				v.website, v.instagram, v.verified
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, e.date_start ASC
			LIMIT 100
		`).all(city.id, now);
    const seenIds = /* @__PURE__ */ new Set();
    const seenKeys = /* @__PURE__ */ new Set();
    const events = eventsRaw.filter((ev) => {
      const id = ev["id"];
      if (seenIds.has(id)) return false;
      const key = `${(ev["title"] ?? "").toString().trim().toLowerCase()}|${ev["date_start"]}|${ev["venue_id"] ?? "null"}`;
      if (seenKeys.has(key)) return false;
      seenIds.add(id);
      seenKeys.add(key);
      return true;
    });
    const venues = db.prepare(`
			SELECT id, name, type, address, lat, lng, website, instagram, description, verified, featured
			FROM venues WHERE city_id = ? AND active = 1
			ORDER BY featured DESC, name ASC
		`).all(city.id);
    const typeCounts = db.prepare(`
			SELECT type, COUNT(*) as count FROM events
			WHERE city_id = ? AND status = 'active' AND date_start >= ?
			GROUP BY type ORDER BY count DESC
		`).all(city.id, now);
    const token = cookies.get("gendo_session");
    const currentUser = token ? getUserByToken(token) : null;
    const meetups = getMeetups({ cityId: city.id, currentUserId: currentUser?.id, limit: 5 });
    return {
      city,
      events: events.map((ev) => ({
        id: ev["id"],
        title: ev["title"],
        description: ev["description"],
        dateStart: ev["date_start"] * 1e3,
        dateEnd: ev["date_end"] ? ev["date_end"] * 1e3 : null,
        type: ev["type"],
        price: ev["price"],
        priceAmount: ev["price_amount"],
        currency: ev["currency"],
        sourceUrl: ev["source_url"],
        imageUrl: ev["image_url"],
        featured: Boolean(ev["featured"]),
        tags: ev["tags"],
        source: ev["source"],
        venueId: ev["venue_id"],
        venueName: ev["venue_name"],
        venueAddress: ev["address"],
        venueLat: ev["v_lat"],
        venueLng: ev["v_lng"],
        venueWebsite: ev["website"],
        venueInstagram: ev["instagram"]
      })),
      venues: venues.map((v) => ({
        id: v["id"],
        name: v["name"],
        type: v["type"],
        address: v["address"],
        lat: v["lat"],
        lng: v["lng"],
        website: v["website"],
        instagram: v["instagram"],
        description: v["description"],
        verified: Boolean(v["verified"]),
        featured: Boolean(v["featured"])
      })),
      typeCounts,
      meetups,
      currentUser: currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.display_name,
        avatarUrl: currentUser.avatar_url,
        travelStyle: currentUser.travel_style
      } : null
    };
  } finally {
    db.close();
  }
};
export {
  load
};
