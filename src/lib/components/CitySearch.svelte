<script lang="ts">
	/**
	 * CitySearch — Búsqueda global por nombre de lugar.
	 * Cubre ciudades, pueblos, aldeas, provincias, estados y barrios.
	 * Geocodifica con Nominatim y lanza /api/discover automáticamente.
	 */
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		discover: { lat: number; lng: number; cityName: string; countryCode: string };
		loading:  boolean;
	}>();

	interface GeoResult {
		lat:         number;
		lng:         number;
		displayName: string;
		name:        string;
		state:       string | null;
		country:     string;
		countryCode: string;
		placeType:   string;
		placeLabel:  string;
		placeEmoji:  string;
	}

	let query       = '';
	let suggestions: GeoResult[] = [];
	let showSuggest = false;
	let searching   = false;
	let discovering = false;
	let timer: ReturnType<typeof setTimeout>;

	async function onInput() {
		clearTimeout(timer);
		if (query.length < 2) { suggestions = []; showSuggest = false; return; }
		timer = setTimeout(async () => {
			searching = true;
			try {
				const res = await fetch(`/api/geocode-city?q=${encodeURIComponent(query)}`);
				if (res.ok) {
					const d    = await res.json();
					suggestions = d.results ?? [];
					showSuggest = suggestions.length > 0;
				}
			} catch {} finally { searching = false; }
		}, 350);
	}

	async function select(geo: GeoResult) {
		query       = geo.name;
		showSuggest = false;
		suggestions = [];
		discovering = true;
		dispatch('loading', true);

		try {
			const res = await fetch('/api/discover', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ lat: geo.lat, lng: geo.lng }),
			});
			if (res.ok) {
				await res.json();
				dispatch('discover', {
					lat:         geo.lat,
					lng:         geo.lng,
					cityName:    geo.name,
					countryCode: geo.countryCode,
				});
			}
		} catch {} finally {
			discovering = false;
			dispatch('loading', false);
		}
	}

	// Genera la bandera de cualquier país del mundo desde su código ISO de 2 letras
	function flag(code: string): string {
		if (!code || code.length !== 2) return '🌍';
		const offset = 0x1F1E6 - 0x41;
		return [...code.toUpperCase()]
			.map(c => String.fromCodePoint(c.charCodeAt(0) + offset))
			.join('');
	}

	// Subtítulo de la sugerencia: "Pueblo · Guayas, Ecuador"
	function subLabel(geo: GeoResult): string {
		const parts: string[] = [geo.placeLabel];
		if (geo.state && geo.state !== geo.name) parts.push(geo.state);
		if (geo.country) parts.push(geo.country);
		return parts.join(' · ');
	}
</script>

<div class="relative w-full">
	<div class="flex items-center gap-2 bg-gendo-muted border border-white/[0.06] hover:border-gendo-accent
	            focus-within:border-gendo-accent rounded-xl px-4 py-2.5 transition-all">
		<span class="text-gray-400 flex-shrink-0">
			{#if discovering}
				<svg class="w-4 h-4 animate-spin text-gendo-accent" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
				</svg>
			{:else if searching}
				<svg class="w-4 h-4 animate-pulse text-gray-500" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
				</svg>
			{:else}
				🔍
			{/if}
		</span>

		<input
			bind:value={query}
			on:input={onInput}
			on:focus={() => { if (suggestions.length > 0) showSuggest = true; }}
			on:blur={() => setTimeout(() => showSuggest = false, 200)}
			type="text"
			placeholder="Ciudad, pueblo, provincia… Salinas, Oaxaca, Guayas"
			disabled={discovering}
			class="flex-1 bg-transparent text-white text-sm placeholder-gray-500
			       focus:outline-none disabled:opacity-50"
		/>
		{#if query}
			<button
				on:click={() => { query = ''; suggestions = []; showSuggest = false; }}
				class="text-gray-600 hover:text-gray-400 transition-colors text-xs flex-shrink-0"
			>✕</button>
		{/if}
	</div>

	<!-- Sugerencias -->
	{#if showSuggest}
		<div class="absolute top-full left-0 right-0 mt-1 bg-gendo-surface border border-white/[0.06]
		            rounded-xl shadow-2xl z-50 overflow-hidden">
			{#each suggestions as geo}
				<button
					on:click={() => select(geo)}
					class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gendo-muted text-left transition-colors border-b border-white/[0.06] last:border-0"
				>
					<!-- Bandera del país -->
					<span class="text-xl flex-shrink-0">{flag(geo.countryCode)}</span>

					<div class="flex-1 min-w-0">
						<!-- Nombre del lugar + emoji de tipo -->
						<p class="text-white text-sm font-medium truncate">
							{geo.placeEmoji} {geo.name}
						</p>
						<!-- Tipo + provincia + país -->
						<p class="text-gray-500 text-xs truncate mt-0.5">
							{subLabel(geo)}
						</p>
					</div>

					<!-- Badge del tipo de lugar -->
					<span class="text-xs flex-shrink-0 px-2 py-0.5 rounded-full border
						{geo.placeType === 'city'      ? 'bg-gendo-accent/10 text-gendo-accent border-gendo-accent/30'
						: geo.placeType === 'town' || geo.placeType === 'village' ? 'bg-green-500/10 text-green-300 border-green-500/30'
						: geo.placeType === 'suburb' || geo.placeType === 'quarter' || geo.placeType === 'neighbourhood' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
						: geo.placeType === 'state' || geo.placeType === 'province' || geo.placeType === 'region' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
						: 'bg-gendo-muted text-gendo-text-muted border-white/[0.06]'}">
						{geo.placeLabel}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if discovering}
		<p class="text-xs text-gendo-accent animate-pulse mt-2 text-center">
			🤖 Buscando en Google Maps… puede tardar ~1 minuto la primera vez
		</p>
	{/if}
</div>
