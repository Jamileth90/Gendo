import { j as json } from './index-CoD1IJuy.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const GET = async ({ url }) => {
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) return json({ events: [] });
  const ids = idsParam.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
  if (ids.length === 0) return json({ events: [] });
  const placeholders = ids.map(() => "?").join(",");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const events = db.prepare(`
			SELECT e.id, e.title, e.description, e.date_start, e.date_end,
				e.type, e.price, e.price_amount, e.currency, e.source_url,
				e.image_url, e.featured, e.tags,
				v.name as venue_name, v.address, v.lat as v_lat, v.lng as v_lng,
				c.name as city_name, c.country, c.state
			FROM events e
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE e.id IN (${placeholders}) AND e.status = 'active'
			ORDER BY e.date_start ASC
		`).all(...ids);
    return json({
      events: events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        dateStart: ev.date_start * 1e3,
        dateEnd: ev.date_end ? ev.date_end * 1e3 : null,
        type: ev.type,
        price: ev.price,
        priceAmount: ev.price_amount,
        currency: ev.currency,
        sourceUrl: ev.source_url,
        imageUrl: ev.image_url,
        featured: Boolean(ev.featured),
        tags: ev.tags,
        venueName: ev.venue_name,
        venueAddress: ev.address,
        venueLat: ev.v_lat,
        venueLng: ev.v_lng,
        cityName: ev.city_name,
        country: ev.country,
        state: ev.state
      }))
    });
  } finally {
    db.close();
  }
};

export { GET };
//# sourceMappingURL=_server.ts-B-rXAMKC.js.map
