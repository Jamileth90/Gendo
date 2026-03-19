import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { g as getUserByToken, b as getEventComments, d as getEventRsvp } from "../../../../chunks/db.js";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const load = async ({ params, cookies }) => {
  const id = Number(params.id);
  if (!id) throw error(404, "Event not found");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const ev = db.prepare(`
			SELECT
				e.*,
				v.id as venue_id, v.name as venue_name, v.type as venue_type,
				v.address, v.lat as v_lat, v.lng as v_lng, v.website, v.instagram,
				v.description as venue_desc,
				c.id as city_id, c.name as city_name, c.country, c.state
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE e.id = ? AND e.status = 'active'
		`).get(id);
    if (!ev) throw error(404, "Event not found");
    const related = db.prepare(`
			SELECT e.id, e.title, e.date_start, e.type, e.price, e.price_amount,
				v.name as venue_name
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			WHERE e.city_id = ? AND e.type = ? AND e.id != ? AND e.status = 'active'
				AND e.date_start >= strftime('%s', 'now')
			ORDER BY e.date_start ASC LIMIT 4
		`).all(ev["city_id"], ev["type"], id);
    const token = cookies.get("gendo_session");
    const currentUser = token ? getUserByToken(token) : null;
    const comments = getEventComments(id, currentUser?.id);
    const rsvp = getEventRsvp(id);
    let userRsvpStatus = null;
    if (currentUser) {
      const r = db.prepare(`SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?`).get(id, currentUser.id);
      userRsvpStatus = r?.status ?? null;
    }
    return {
      event: {
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
        venueName: ev["venue_name"],
        venueType: ev["venue_type"],
        venueAddress: ev["address"],
        venueLat: ev["v_lat"],
        venueLng: ev["v_lng"],
        venueWebsite: ev["website"],
        venueInstagram: ev["instagram"],
        venueDesc: ev["venue_desc"],
        cityName: ev["city_name"],
        cityId: ev["city_id"],
        country: ev["country"],
        state: ev["state"]
      },
      comments,
      rsvp,
      userRsvpStatus,
      currentUser: currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.display_name,
        avatarUrl: currentUser.avatar_url,
        travelStyle: currentUser.travel_style
      } : null,
      related: related.map((r) => ({
        id: r["id"],
        title: r["title"],
        dateStart: r["date_start"] * 1e3,
        type: r["type"],
        price: r["price"],
        priceAmount: r["price_amount"],
        venueName: r["venue_name"]
      }))
    };
  } finally {
    db.close();
  }
};
export {
  load
};
