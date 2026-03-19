import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchEvents, getSearchSuggestions } from '$lib/search';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const suggest = url.searchParams.get('suggest') === 'true';
	const cityId = url.searchParams.get('cityId') ? Number(url.searchParams.get('cityId')) : undefined;
	const type = url.searchParams.get('type') ?? undefined;
	const dateFilter = url.searchParams.get('date') as 'today' | 'tomorrow' | 'weekend' | 'week' | undefined;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	if (!q || q.length < 1) return json({ events: [], suggestions: [], total: 0 });

	if (suggest) {
		const suggestions = getSearchSuggestions(q, 8);
		return json({ suggestions });
	}

	const results = searchEvents({ query: q, cityId, type, dateFilter, limit, offset });
	return json({
		events: results.map(r => ({ ...r.event, rank: r.rank, snippet: r.snippet })),
		total: results.length,
		query: q
	});
};
