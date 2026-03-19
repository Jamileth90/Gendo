<script lang="ts">
	/**
	 * StatsPanel — Panel de estadísticas globales de Gendo.
	 * Muestra países, ciudades, zonas cacheadas y eventos descubiertos.
	 */
	import { onMount } from 'svelte';

	interface Stats {
		global: {
			total_events:   number;
			total_venues:   number;
			total_cities:   number;
			total_countries:number;
			gps_events:     number;
			zones_cached:   number;
			pref_records:   number;
		};
		countries: { country_code: string; country: string; cities: number; events: number }[];
		topCities: { name: string; country_code: string; state: string | null; events: number }[];
		categories: { type: string; total: number }[];
		lastDiscoveryAt: number | null;
	}

	let stats: Stats | null  = null;
	let loading              = true;
	let open                 = false;

	$: totalCats = stats?.categories.reduce((s, c) => s + c.total, 0) ?? 0;

	// Genera la bandera de CUALQUIER país del mundo desde su código ISO de 2 letras.
	// Funciona para los 195 países sin necesidad de lista manual.
	function flag(code: string): string {
		if (!code || code.length !== 2) return '🌍';
		const offset = 0x1F1E6 - 0x41; // 'A' = 0x41, primer indicador regional = 0x1F1E6
		return [...code.toUpperCase()]
			.map(c => String.fromCodePoint(c.charCodeAt(0) + offset))
			.join('');
	}

	const TYPE_EMOJI: Record<string, string> = {
		pesca:'🐟', ciclismo:'🚲', yoga:'🧘', social:'🎉',
		outdoor:'🌿', live_music:'🎵', food:'🍽️', art:'🎨',
	};

	function timeAgo(ms: number) {
		const diff = Math.floor((Date.now() - ms) / 1000);
		if (diff < 60)   return `hace ${diff}s`;
		if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
		if (diff < 86400)return `hace ${Math.floor(diff/3600)} h`;
		return `hace ${Math.floor(diff/86400)} días`;
	}

	onMount(async () => {
		try {
			const res = await fetch('/api/stats');
			if (res.ok) stats = await res.json();
		} catch {}
		loading = false;
	});
</script>

<!-- Botón de acceso al panel -->
<button
	on:click={() => open = !open}
	class="w-full flex items-center justify-between px-5 py-4 bg-gendo-surface border border-white/[0.06] rounded-2xl hover:border-gendo-accent transition-all group"
>
	<div class="flex items-center gap-3">
		<span class="text-2xl">🌍</span>
		<div class="text-left">
			<p class="text-white font-bold text-sm">Gendo en el Mundo</p>
			{#if stats}
				<p class="text-gray-400 text-xs">
					{stats.global.total_countries} países · {stats.global.total_cities} ciudades · {stats.global.gps_events} lugares descubiertos
				</p>
			{:else if loading}
				<p class="text-gray-600 text-xs">Cargando…</p>
			{/if}
		</div>
	</div>
	<span class="text-gray-500 group-hover:text-indigo-400 transition-colors text-sm">
		{open ? '▲' : '▼'}
	</span>
</button>

<!-- Panel expandible -->
{#if open && stats}
	<div class="mt-2 bg-gendo-surface border border-white/[0.06] rounded-2xl overflow-hidden">

		<!-- Métricas principales -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-white/[0.06]">
			{#each [
				{ label:'Eventos totales', value: stats.global.total_events.toLocaleString(), icon:'🗓️' },
				{ label:'Países',          value: stats.global.total_countries.toString(),     icon:'🌍' },
				{ label:'Ciudades',        value: stats.global.total_cities.toString(),         icon:'🏙️' },
				{ label:'Zonas cacheadas', value: stats.global.zones_cached.toString(),         icon:'📦' },
			] as m}
				<div class="flex flex-col items-center justify-center py-5 px-3 text-center border-r border-white/[0.06] last:border-0">
					<span class="text-2xl mb-1">{m.icon}</span>
					<span class="text-2xl font-bold text-white">{m.value}</span>
					<span class="text-xs text-gray-500 mt-0.5">{m.label}</span>
				</div>
			{/each}
		</div>

		<!-- Barra de categorías GPS -->
		{#if stats.categories.length > 0}
			<div class="px-5 py-4 border-b border-white/[0.06]">
				<p class="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Lugares descubiertos por categoría</p>
				<div class="space-y-2">
					{#each stats.categories as cat}
						{@const pct = totalCats > 0 ? Math.round((cat.total / totalCats) * 100) : 0}
						<div class="flex items-center gap-3">
							<span class="w-5 text-center flex-shrink-0">{TYPE_EMOJI[cat.type] ?? '📍'}</span>
							<span class="text-xs text-gray-400 w-16 flex-shrink-0 capitalize">{cat.type}</span>
							<div class="flex-1 h-2 bg-gendo-muted rounded-full overflow-hidden">
								<div class="h-full rounded-full transition-all duration-700
									{cat.type==='pesca'    ? 'bg-blue-500'
									: cat.type==='ciclismo' ? 'bg-green-500'
									: cat.type==='yoga'     ? 'bg-purple-500'
									                        : 'bg-orange-500'}"
									style="width:{pct}%">
								</div>
							</div>
							<span class="text-xs text-gray-500 w-8 text-right">{cat.total}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Países con eventos -->
		{#if stats.countries.length > 0}
			<div class="px-5 py-4 border-b border-white/[0.06]">
				<p class="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Países activos</p>
				<div class="flex flex-wrap gap-2">
					{#each stats.countries as c}
						<div class="flex items-center gap-1.5 bg-gendo-muted px-3 py-1.5 rounded-full text-xs">
							<span>{flag(c.country_code)}</span>
							<span class="text-white font-medium">{c.country_code}</span>
							<span class="text-gray-500">{c.events} eventos</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Top ciudades -->
		{#if stats.topCities.length > 0}
			<div class="px-5 py-4">
				<p class="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Top ciudades</p>
				<div class="grid grid-cols-2 gap-2">
					{#each stats.topCities as city, i}
						<div class="flex items-center gap-2 text-sm">
							<span class="text-gray-600 w-4 text-right flex-shrink-0">{i+1}</span>
							<span>{flag(city.country_code)}</span>
							<span class="text-gray-300 truncate">{city.name}</span>
							<span class="text-gray-600 flex-shrink-0 ml-auto">{city.events}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Última actualización -->
		{#if stats.lastDiscoveryAt}
			<div class="px-5 pb-4 pt-0">
				<p class="text-xs text-gray-700">
					🤖 Última búsqueda GPS: {timeAgo(stats.lastDiscoveryAt)}
				</p>
			</div>
		{/if}
	</div>
{/if}
