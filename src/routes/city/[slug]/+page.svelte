<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import { saveCityCache } from '$lib/offline';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';
	import { formatCityDisplay } from '$lib/formatCity';
	import { getUserLang, translateBatch } from '$lib/translate';

	export let data: PageData;

	const typeEmoji: Record<string, string> = { live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂', festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅' };
	const typeLabel: Record<string, string> = { live_music: 'Live Music', theater: 'Theater', sports: 'Sports', comedy: 'Comedy', festival: 'Festival', food: 'Food & Drink', art: 'Art', cinema: 'Cinema', other: 'Events' };
	const travelEmoji: Record<string, string> = { backpacker: '🎒', nomad: '💻', solo_traveler: '🧭', traveler: '✈️', local: '📍', expat: '🌍' };

	let selectedType = 'all';
	let searchQuery = '';
	type TimeFilter = 'all' | 'today' | 'tomorrow' | 'weekend';
	let timeFilter: TimeFilter = 'all';
	let refreshingCr = false;
	let refreshMsg = '';

	function eventMatchesTime(ev: { dateStart: number }, filter: TimeFilter): boolean {
		if (filter === 'all') return true;
		const d = new Date(ev.dateStart);
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrowStart = new Date(todayStart);
		tomorrowStart.setDate(tomorrowStart.getDate() + 1);
		const evDateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		if (filter === 'today') return evDateStart.getTime() === todayStart.getTime();
		if (filter === 'tomorrow') return evDateStart.getTime() === tomorrowStart.getTime();
		if (filter === 'weekend') {
			const dow = evDateStart.getDay();
			if (dow !== 0 && dow !== 6) return false;
			const daysAhead = (evDateStart.getTime() - todayStart.getTime()) / 86400000;
			return daysAhead >= 0 && daysAhead < 14;
		}
		return true;
	}

	// Favoritos (corazón)
	const SAVED_KEY = 'gendo_saved_ids';
	let savedEventIds = new Set<number>();
	let savingEventId: number | null = null;
	let savedEventsLoggedIn = false;

	async function loadSavedEvents() {
		try {
			const res = await fetch('/api/saved-events');
			const d = await res.json();
			if (res.ok && d.isLoggedIn && Array.isArray(d.eventIds)) {
				savedEventIds = new Set(d.eventIds);
				savedEventsLoggedIn = true;
			} else if (typeof window !== 'undefined') {
				const raw = localStorage.getItem(SAVED_KEY);
				const ids: number[] = raw ? JSON.parse(raw) : [];
				savedEventIds = new Set(ids);
				savedEventsLoggedIn = false;
			}
		} catch {}
	}

	async function toggleSave(eventId: number, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (savingEventId !== null) return;
		savingEventId = eventId;
		const isSaved = savedEventIds.has(eventId);
		try {
			if (savedEventsLoggedIn) {
				if (isSaved) {
					await fetch('/api/saved-events', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ eventId }),
					});
				} else {
					await fetch('/api/saved-events', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ eventId }),
					});
				}
				const r = await fetch('/api/saved-events');
				const resData = await r.json();
				savedEventIds = new Set(resData.eventIds ?? []);
			} else {
				if (isSaved) {
					savedEventIds = new Set([...savedEventIds].filter((x) => x !== eventId));
				} else {
					savedEventIds = new Set([...savedEventIds, eventId]);
				}
				localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(savedEventIds)));
			}
		} catch {}
		finally {
			savingEventId = null;
		}
	}

	const todayKey = format(new Date(), 'yyyy-MM-dd');
	const isCedarRapids = data.city.name.toLowerCase().includes('cedar rapids');

	async function refreshCedarRapids() {
		if (!isCedarRapids || refreshingCr) return;
		refreshingCr = true;
		refreshMsg = '';
		try {
			const res = await fetch('/api/refresh-cr', { method: 'POST' });
			const d = await res.json();
			if (d.started) {
				refreshMsg = '✅ Refreshing events… Reload the page in 1–2 min to see new ones.';
			} else {
				refreshMsg = d.error ?? 'Try again later.';
			}
		} catch {
			refreshMsg = 'Network error. Try again.';
		}
		refreshingCr = false;
		setTimeout(() => refreshMsg = '', 8000);
	}

	$: filteredEvents = data.events.filter(ev => {
		const matchType = selectedType === 'all' || ev.type === selectedType;
		const matchSearch = !searchQuery || ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || (ev.venueName ?? '').toLowerCase().includes(searchQuery.toLowerCase());
		const matchTime = eventMatchesTime(ev, timeFilter);
		return matchType && matchSearch && matchTime;
	});

	$: todayCount = data.events.filter(ev => format(new Date(ev.dateStart), 'yyyy-MM-dd') === todayKey).length;

	$: groupedEvents = filteredEvents.reduce((acc, ev) => {
		const d = new Date(ev.dateStart);
		const key = format(d, 'yyyy-MM-dd');
		if (!acc[key]) acc[key] = [];
		acc[key].push(ev);
		return acc;
	}, {} as Record<string, typeof filteredEvents>);

	$: sortedDates = Object.keys(groupedEvents).sort();

	function formatDateHeader(dateKey: string) {
		const d = new Date(dateKey + 'T12:00:00');
		const today = new Date();
		const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
		if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return '🗓️ Today';
		if (format(d, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return '🗓️ Tomorrow';
		return format(d, 'EEEE, MMMM d, yyyy');
	}

	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		try { return JSON.parse(tags).slice(0, 4); } catch { return []; }
	}

	function getDirectionsUrl(ev: { venueLat?: number | null; venueLng?: number | null; venueName?: string | null; venueAddress?: string | null; cityName?: string | null }) {
		const destQuery = encodeURIComponent([ev.venueAddress, ev.venueName, ev.cityName].filter(Boolean).join(', ') || '');
		const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
		if (ev.venueLat != null && ev.venueLng != null) {
			if (isIOS) return `https://maps.apple.com/?daddr=${ev.venueLat},${ev.venueLng}`;
			return `https://www.google.com/maps/dir/?api=1&destination=${ev.venueLat},${ev.venueLng}`;
		}
		if (isIOS) return `https://maps.apple.com/?q=${destQuery}`;
		return `https://www.google.com/maps/search/?api=1&query=${destQuery}`;
	}

	function openDirections(e: MouseEvent, ev: { venueLat?: number | null; venueLng?: number | null; venueName?: string | null; venueAddress?: string | null; cityName?: string | null }) {
		e.preventDefault();
		e.stopPropagation();
		window.open(getDirectionsUrl(ev), '_blank', 'noopener');
	}

	function formatPrice(ev: {price:string|null;priceAmount:number|null;currency:string|null}) {
		if (ev.price === 'free') return 'FREE';
		if (ev.priceAmount) return `$${ev.priceAmount}`;
		return ev.price === 'paid' ? 'Paid' : '';
	}

	const citySlug = data.city.name.toLowerCase().replace(/\s+/g, '-');

	// Traducción según idioma del dispositivo
	let userLang = 'en' as 'es' | 'en';
	let translatedTitles: Map<string, string> = new Map();
	$: if (typeof window !== 'undefined') userLang = getUserLang();
	$: toTranslate = filteredEvents.slice(0, 50).map((ev) => cleanEventTitle(ev.title, data.city.name)).filter((t) => t && t.length > 2);
	$: uniqueTitles = [...new Set(toTranslate)];
	$: if (uniqueTitles.length > 0 && userLang) {
		translateBatch(uniqueTitles, userLang).then((translations) => {
			const m = new Map<string, string>();
			uniqueTitles.forEach((t, i) => m.set(t, translations[i] ?? t));
			translatedTitles = m;
		});
	}
	function t(title: string): string {
		return translatedTitles.get(title) ?? title;
	}

	onMount(() => {
		loadSavedEvents();
		try {
			saveCityCache(citySlug, {
				events: data.events.map((ev) => ({
					id: ev.id,
					title: ev.title,
					description: ev.description,
					dateStart: ev.dateStart,
					dateEnd: ev.dateEnd,
					type: ev.type,
					price: ev.price,
					priceAmount: ev.priceAmount,
					currency: ev.currency,
					venueName: ev.venueName,
					venueAddress: ev.venueAddress,
					venueLat: ev.venueLat,
					venueLng: ev.venueLng,
					cityName: data.city.name,
					cityState: data.city.state,
					cityCountry: data.city.country,
					sourceUrl: ev.sourceUrl,
				})),
				city: { name: data.city.name, state: data.city.state, country: data.city.country },
				venues: data.venues.map((v) => ({
					id: v.id,
					name: v.name,
					address: v.address,
					website: v.website,
				})),
				typeCounts: data.typeCounts,
			});
		} catch {}
	});
</script>

<svelte:head>
	<title>{formatCityDisplay(data.city)} — Events, Meetups & More | Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">

	<!-- Hero — responsive -->
	<div class="bg-gradient-to-br from-gendo-surface via-gendo-muted to-gendo-bg py-6 sm:py-10 px-4 sm:px-6">
		<div class="max-w-6xl mx-auto">
			<a href="/" class="text-gendo-accent hover:text-white text-sm mb-3 inline-block py-2">← Gendo</a>
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div class="min-w-0">
					<h1 class="text-3xl sm:text-4xl font-bold text-white truncate">{formatCityDisplay(data.city)}</h1>
					<p class="text-gendo-cream/80 mt-1">
						{data.city.country}
						· {data.events.length} upcoming events
					</p>
					<div class="flex flex-wrap gap-2 mt-3">
						{#each data.typeCounts as tc}
							<span class="bg-white/10 px-3 py-1 rounded-full text-sm text-white/80">
								{typeEmoji[tc.type] ?? '📅'} {typeLabel[tc.type] ?? tc.type} ({tc.count})
							</span>
						{/each}
					</div>
				</div>
				<div class="flex gap-3 flex-wrap">
					{#if isCedarRapids}
						<button
							on:click={refreshCedarRapids}
							disabled={refreshingCr}
							class="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
							{#if refreshingCr}
								<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
							{:else}
								🔄
							{/if}
							Refresh events
						</button>
					{/if}
					<a href="/meetups?city={encodeURIComponent(data.city.name)}"
						class="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
						🤝 Meetups ({data.meetups.length})
					</a>
					<a href="/meetups?city={encodeURIComponent(data.city.name)}"
						class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm transition-colors">
						+ Post Meetup
					</a>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

		<!-- Traveler Meetups preview -->
		{#if data.meetups.length > 0}
			<div class="mb-8 bg-gendo-surface border border-gendo-accent/30 rounded-2xl p-5">
				<div class="flex items-center justify-between mb-4">
					<h2 class="font-semibold text-white">🤝 Traveler Meetups in {formatCityDisplay(data.city)}</h2>
					<a href="/meetups?city={encodeURIComponent(data.city.name)}" class="text-sm text-purple-400 hover:text-purple-300">See all →</a>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each data.meetups.slice(0, 3) as meetup (meetup.id)}
						<div class="bg-gendo-muted rounded-xl p-3 border border-white/[0.06]">
							<div class="flex items-center gap-2 mb-2">
								<img src={meetup.avatar_url ?? `https://ui-avatars.com/api/?name=${meetup.username}&background=random&color=fff&size=64`}
									alt={meetup.username} class="w-6 h-6 rounded-full" />
								<span class="text-xs text-gray-400">{meetup.display_name ?? meetup.username} {travelEmoji[meetup.travel_style] ?? '✈️'}</span>
							</div>
							<p class="text-white text-sm font-medium line-clamp-2">{meetup.title}</p>
							<p class="text-gray-400 text-xs mt-1">📍 {meetup.location_name} · 👥 {meetup.attendee_count}/{meetup.max_people}</p>
							<p class="text-gendo-accent text-xs mt-1">{format(new Date(meetup.date_start * 1000), 'MMM d, h:mm a')}</p>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mb-8 bg-gendo-surface border border-white/[0.06] border-dashed rounded-2xl p-5 text-center">
				<p class="text-gray-400">🤝 No traveler meetups yet in {formatCityDisplay(data.city)}.</p>
				<a href="/meetups?city={encodeURIComponent(data.city.name)}" class="text-gendo-accent hover:text-gendo-accent/80 text-sm mt-1 inline-block">
					Be the first to post one →
				</a>
			</div>
		{/if}

		<!-- Refresh message -->
		{#if refreshMsg}
			<div class="mb-6 p-3 rounded-xl bg-gendo-accent/15 border border-gendo-accent/30 text-gendo-cream/90 text-sm">
				{refreshMsg}
			</div>
		{/if}

		<!-- Filtro de tiempo: Hoy, Mañana, Fin de Semana -->
		<div class="mb-6 flex flex-wrap gap-2">
			{#each ['today', 'tomorrow', 'weekend', 'all'] as tf}
				{@const label = tf === 'today' ? 'Hoy' : tf === 'tomorrow' ? 'Mañana' : tf === 'weekend' ? 'Fin de Semana' : 'Todos'}
				{@const isActive = timeFilter === tf}
				<button
					on:click={() => timeFilter = tf}
					class="px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 min-h-[40px]
						{isActive
							? 'bg-gendo-accent text-white shadow-md'
							: 'bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80 border border-white/[0.06]'}"
				>
					{label}
				</button>
			{/each}
		</div>

		<!-- Happening today banner -->
		{#if todayCount > 0 && timeFilter !== 'today'}
			<div class="mb-6 p-4 rounded-xl bg-emerald-950/50 border border-emerald-700/40">
				<div class="flex items-center justify-between flex-wrap gap-3">
					<div class="flex items-center gap-2">
						<span class="text-2xl">🕐</span>
						<div>
							<h3 class="font-semibold text-emerald-100">Happening today in {formatCityDisplay(data.city)}</h3>
							<p class="text-sm text-emerald-300/80">{todayCount} event{todayCount === 1 ? '' : 's'} right now</p>
						</div>
					</div>
					<button
						on:click={() => timeFilter = 'today'}
						class="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50">
						Ver solo hoy
					</button>
				</div>
			</div>
		{/if}

		<!-- Filters + search -->
		<div class="flex flex-col sm:flex-row gap-3 mb-6">
			<input bind:value={searchQuery} type="text" placeholder="Search events, breweries, St. Patrick's..."
				class="flex-1 bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 min-h-[44px] focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
			<select bind:value={selectedType}
				class="bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 min-h-[44px] focus:outline-none focus:border-gendo-accent">
				<option value="all">All Types</option>
				{#each data.typeCounts as tc}
					<option value={tc.type}>{typeEmoji[tc.type] ?? '📅'} {typeLabel[tc.type] ?? tc.type}</option>
				{/each}
			</select>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

			<!-- Events (2/3) -->
			<div class="lg:col-span-2">
				{#if filteredEvents.length === 0}
					<div class="text-center text-gray-400 py-16">
						<p class="text-2xl mb-2">🔍</p>
						<p>No events found for that filter.</p>
					</div>
				{:else}
					{#each sortedDates as dateKey}
						<div class="mb-8">
							<h2 class="text-lg font-semibold text-gendo-accent mb-3 pb-2 border-b border-white/[0.06]">{formatDateHeader(dateKey)}</h2>
							<div class="space-y-3">
								{#each groupedEvents[dateKey] as ev (ev.id)}
									<a href="/event/{ev.id}" class="block bg-gendo-surface border border-white/[0.06] rounded-xl p-4 hover:border-gendo-accent/50 transition-colors group relative">
										<!-- Corazón favoritos -->
										<button
											on:click={(e) => toggleSave(ev.id, e)}
											disabled={savingEventId === ev.id}
											class="absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10
												{savedEventIds.has(ev.id)
													? 'text-red-400 hover:bg-red-500/20'
													: 'text-gray-500 hover:text-red-400 hover:bg-white/5'}"
											title={savedEventIds.has(ev.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
										>
											{#if savingEventId === ev.id}
												<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
											{:else if savedEventIds.has(ev.id)}
												<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
											{/if}
										</button>
										<div class="flex items-start gap-3">
											<div class="text-2xl flex-shrink-0 mt-0.5">{typeEmoji[ev.type] ?? '📅'}</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 flex-wrap">
													{#if ev.featured}
														<span class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">⭐ Featured</span>
													{/if}
													<h3 class="font-semibold text-white group-hover:text-gendo-accent transition-colors">{t(cleanEventTitle(ev.title, data.city.name))}</h3>
												</div>
												<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-400">
													{#if ev.venueName}
														<button
															on:click={(e) => openDirections(e, { ...ev, cityName: data.city.name })}
															class="hover:text-gendo-accent transition-colors cursor-pointer text-left"
															title="Abrir en mapa"
														>📍 {cleanVenueName(ev.venueName, data.city.name)}</button>
													{/if}
													<span>🕐 {format(new Date(ev.dateStart), 'h:mm a')}</span>
													{#if ev.price}
														<span class={ev.price === 'free' ? 'text-green-400 font-medium' : 'text-yellow-400'}>{formatPrice(ev)}</span>
													{/if}
												</div>
												{#if ev.description}
													<p class="mt-1.5 text-sm text-gray-400 line-clamp-2">{ev.description}</p>
												{/if}
												{#if parseTags(ev.tags).length > 0}
													<div class="flex flex-wrap gap-1 mt-1.5">
														{#each parseTags(ev.tags) as tag}
															<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#{tag}</span>
														{/each}
													</div>
												{/if}
												<button
													on:click={(e) => openDirections(e, { ...ev, cityName: data.city.name })}
													class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors"
													title="Cómo llegar"
												>
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
													Cómo llegar
												</button>
											</div>
											<span class="text-gendo-accent text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">→</span>
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Sidebar: Venues (1/3) -->
			<div>
				<h2 class="text-base font-semibold text-white mb-3">🏟️ Venues in {formatCityDisplay(data.city)}</h2>
				<div class="space-y-2">
					{#each data.venues as venue (venue.id)}
						<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-3 hover:border-gendo-accent/30 transition-colors">
							<div class="flex items-start gap-2">
								<span class="text-lg flex-shrink-0">
									{#if venue.type === 'stadium'}🏟️
									{:else if venue.type === 'theater'}🎭
									{:else if venue.type === 'bar'}🍺
									{:else if venue.type === 'restaurant'}🍽️
									{:else if venue.type === 'outdoor'}🌳
									{:else}📍{/if}
								</span>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-1">
										<span class="font-medium text-white text-sm">{venue.name}</span>
										{#if venue.verified}<span class="text-blue-400 text-xs">✓</span>{/if}
									</div>
									{#if venue.address}<p class="text-xs text-gray-500 truncate">{venue.address}</p>{/if}
									<div class="flex gap-2 mt-1">
										{#if venue.website}<a href={venue.website} target="_blank" rel="noopener" class="text-xs text-gendo-accent hover:text-gendo-accent/80">Website →</a>{/if}
										{#if venue.instagram}<a href="https://instagram.com/{venue.instagram}" target="_blank" rel="noopener" class="text-xs text-pink-400">@{venue.instagram}</a>{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Map link -->
				{#if data.city.lat && data.city.lng}
					<div class="mt-4 bg-gendo-surface border border-white/[0.06] rounded-xl p-3">
						<a href="https://www.openstreetmap.org/?mlat={data.city.lat}&mlon={data.city.lng}#map=13/{data.city.lat}/{data.city.lng}"
							target="_blank" rel="noopener" class="text-sm text-gendo-accent hover:text-gendo-accent/80">
							📍 Open Map of {formatCityDisplay(data.city)} →
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
