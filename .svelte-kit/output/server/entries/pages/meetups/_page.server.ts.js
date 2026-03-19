import { g as getUserByToken, c as getMeetups } from "../../../chunks/db.js";
import Database from "better-sqlite3";
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
const load = async ({ url, cookies }) => {
  const cityName = url.searchParams.get("city")?.trim();
  const cityId = url.searchParams.get("cityId") ? Number(url.searchParams.get("cityId")) : void 0;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    let resolvedCityId = cityId;
    let resolvedCity = null;
    if (!resolvedCityId && cityName) {
      resolvedCity = db.prepare(`SELECT id, name, country, state FROM cities WHERE name LIKE ? LIMIT 1`).get(`%${cityName}%`);
      resolvedCityId = resolvedCity?.id;
    } else if (resolvedCityId) {
      resolvedCity = db.prepare(`SELECT id, name, country, state FROM cities WHERE id = ?`).get(resolvedCityId);
    }
    const token = cookies.get("gendo_session");
    const currentUser = token ? getUserByToken(token) : null;
    const meetups = getMeetups({ cityId: resolvedCityId, currentUserId: currentUser?.id });
    const popularCities = db.prepare(`
			SELECT c.id, c.name, c.country, c.state, COUNT(m.id) as meetup_count
			FROM cities c
			LEFT JOIN meetups m ON m.city_id = c.id AND m.status = 'active' AND m.date_start >= strftime('%s','now')
			GROUP BY c.id
			ORDER BY meetup_count DESC, c.name ASC
			LIMIT 20
		`).all();
    return {
      meetups,
      city: resolvedCity,
      popularCities,
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
