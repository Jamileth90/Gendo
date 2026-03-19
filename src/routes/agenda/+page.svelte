<script lang="ts">
	import { onMount } from 'svelte';
	import { format } from 'date-fns';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';
	import { formatEventCity } from '$lib/formatCity';

	const SAVED_KEY = 'gendo_saved_ids';
	const typeEmoji: Record<string, string> = { live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂', festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅' };

	let eventIds: number[] = [];
	let events: Array<{
		id: number;
		title: string;
		dateStart: number;
		dateEnd: number | null;
		type: string;
		price: string | null;
		priceAmount: number | null;
		venueName: string | null;
		venueAddress: string | null;
		venueLat: number | null;
		venueLng: number | null;
		cityName: string | null;
		cityState?: string | null;
		cityCountry?: string | null;
		sourceUrl: string | null;
	}> = [];
	let loading = true;
	let isLoggedIn = false;

	async function loadSaved() {
		loading = true;
		try {
			const res = await fetch('/api/saved-events');
			const d = await res.json();
			if (res.ok && d.isLoggedIn) {
				eventIds = d.eventIds ?? [];
				isLoggedIn = true;
			} else {
				// Anonymous: use localStorage
				try {
					const raw = localStorage.getItem(SAVED_KEY);
					eventIds = raw ? JSON.parse(raw) : [];
				} catch {
					eventIds = [];
				}
			}

			if (eventIds.length > 0) {
				const idsRes = await fetch(`/api/events/by-ids?ids=${eventIds.join(',')}`);
				const idsData = await idsRes.json();
				events = (idsData.events ?? []).sort((a: { dateStart: number }, b: { dateStart: number }) => a.dateStart - b.dateStart);
			} else {
				events = [];
			}
		} catch {
			events = [];
		} finally {
			loading = false;
		}
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

	async function remove(id: number) {
		if (isLoggedIn) {
			await fetch('/api/saved-events', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId: id }),
			});
		} else {
			eventIds = eventIds.filter((x) => x !== id);
			localStorage.setItem(SAVED_KEY, JSON.stringify(eventIds));
		}
		events = events.filter((e) => e.id !== id);
	}

	onMount(loadSaved);
</script>

<svelte:head>
	<title>My Agenda | Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">
	<div class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
		<a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block">← Gendo</a>
		<h1 class="text-3xl font-bold mb-2">📅 My Agenda</h1>
		<p class="text-gray-400 mb-8">Events you've saved. {#if !isLoggedIn}Sign in to sync across devices.{/if}</p>

		{#if loading}
			<div class="text-center py-16 text-gray-500">
				<svg class="w-8 h-8 animate-spin mx-auto mb-3 text-gendo-accent" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
				</svg>
				Loading...
			</div>
		{:else if events.length === 0}
			<div class="text-center py-16 bg-gendo-surface border border-white/[0.06] rounded-2xl">
				<p class="text-4xl mb-4">📭</p>
				<p class="text-gray-400 mb-2">No saved events yet</p>
				<p class="text-sm text-gray-500 mb-4">Browse events and tap the bookmark to add them here.</p>
				<a href="/" class="text-gendo-accent hover:text-gendo-accent/80 text-sm font-medium">Discover events →</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each events as ev (ev.id)}
					<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4 flex items-start gap-3 group">
						<div class="text-2xl flex-shrink-0">{typeEmoji[ev.type] ?? '📅'}</div>
						<a href="/event/{ev.id}" class="flex-1 min-w-0">
							<h3 class="font-semibold text-white group-hover:text-gendo-accent transition-colors">{cleanEventTitle(ev.title, ev.cityName)}</h3>
							<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-400">
								<span>🕐 {format(new Date(ev.dateStart), 'MMM d, h:mm a')}</span>
								{#if ev.venueName}
									<button
										on:click={(e) => openDirections(e, ev)}
										class="hover:text-gendo-accent transition-colors cursor-pointer"
										title="Abrir en mapa"
									>📍 {cleanVenueName(ev.venueName, ev.cityName)}</button>
								{/if}
								{#if ev.cityName}<span>· {formatEventCity({ cityName: ev.cityName, cityState: ev.state ?? ev.cityState, cityCountry: ev.country ?? ev.cityCountry })}</span>{/if}
								{#if ev.price === 'free'}<span class="text-green-400">FREE</span>{:else if ev.priceAmount}<span>${ev.priceAmount}</span>{/if}
							</div>
						</a>
						<button
							on:click={() => remove(ev.id)}
							class="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
							title="Remove from agenda">
							✕
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
