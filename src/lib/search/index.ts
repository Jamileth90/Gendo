import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_URL ?? './gendo.db';

function getRawDb() {
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	return db;
}

export interface SearchResult {
	event: Record<string, unknown>;
	rank: number;
	snippet?: string;
}

export interface SearchOptions {
	query: string;
	cityId?: number;
	type?: string;
	dateFilter?: 'today' | 'tomorrow' | 'weekend' | 'week' | 'all';
	limit?: number;
	offset?: number;
}

export function searchEvents(opts: SearchOptions): SearchResult[] {
	const { query, cityId, type, limit = 20, offset = 0 } = opts;
	if (!query.trim()) return [];

	const db = getRawDb();
	try {
		const words = query.trim().split(/\s+/).filter(Boolean);
		const ftsQuery = words.map((w, i) => {
			const clean = w.replace(/["'*^]/g, '');
			return i === words.length - 1 ? `${clean}*` : clean;
		}).join(' ');

		const now = Math.floor(Date.now() / 1000);
		let dateCond = `e.date_start >= ${now}`;
		if (opts.dateFilter === 'today') dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 86400}`;
		else if (opts.dateFilter === 'tomorrow') { const t = now + 86400; dateCond = `e.date_start >= ${t} AND e.date_start < ${t + 86400}`; }
		else if (opts.dateFilter === 'week') dateCond = `e.date_start >= ${now} AND e.date_start < ${now + 7 * 86400}`;

		const cityFilter = cityId ? `AND e.city_id = ${cityId}` : '';
		const typeFilter = type ? `AND e.type = '${type.replace(/'/g, "''")}'` : '';

		const sql = `
			SELECT e.*, v.name as v_name, v.address as v_address, v.website as v_website,
				v.instagram as v_instagram, v.verified as v_verified,
				c.name as c_name, c.country as c_country, c.state as c_state,
				bm25(events_fts) as rank,
				snippet(events_fts, 0, '<mark>', '</mark>', '...', 10) as snippet
			FROM events_fts
			JOIN events e ON e.id = events_fts.rowid
			LEFT JOIN venues v ON v.id = e.venue_id
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE events_fts MATCH ?
				AND e.status = 'active' AND ${dateCond}
				${cityFilter} ${typeFilter}
			ORDER BY e.featured DESC, rank
			LIMIT ? OFFSET ?
		`;

		const rows = db.prepare(sql).all(ftsQuery, limit, offset) as Record<string, unknown>[];
		return rows.map(row => ({ rank: row['rank'] as number, snippet: row['snippet'] as string, event: row }));
	} catch {
		return fallbackSearch(query, opts, db);
	} finally {
		db.close();
	}
}

function fallbackSearch(query: string, opts: SearchOptions, db: Database.Database): SearchResult[] {
	const now = Math.floor(Date.now() / 1000);
	const rows = db.prepare(`
		SELECT e.*, v.name as v_name, v.address as v_address,
			c.name as c_name, c.country as c_country, c.state as c_state
		FROM events e
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE (e.title LIKE ? OR e.description LIKE ? OR v.name LIKE ?)
			AND e.status = 'active' AND e.date_start >= ?
		ORDER BY e.featured DESC, e.date_start ASC
		LIMIT ? OFFSET ?
	`).all(`%${query}%`, `%${query}%`, `%${query}%`, now, opts.limit ?? 20, opts.offset ?? 0) as Record<string, unknown>[];
	return rows.map(row => ({ rank: 0, event: row }));
}

export function getSearchSuggestions(query: string, limit = 8): unknown[] {
	if (!query || query.trim().length < 2) return [];
	const db = getRawDb();
	try {
		const ftsQuery = `${query.trim().replace(/["'*^]/g, '')}*`;
		const now = Math.floor(Date.now() / 1000);
		return db.prepare(`
			SELECT e.id, e.title, e.type, e.date_start, c.name as city_name
			FROM events_fts
			JOIN events e ON e.id = events_fts.rowid
			LEFT JOIN cities c ON c.id = e.city_id
			WHERE events_fts MATCH ? AND e.status = 'active' AND e.date_start >= ?
			ORDER BY e.featured DESC, bm25(events_fts)
			LIMIT ?
		`).all(ftsQuery, now, limit);
	} catch { return []; } finally { db.close(); }
}
