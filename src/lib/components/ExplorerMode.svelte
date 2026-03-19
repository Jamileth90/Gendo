<script lang="ts">
	import { onMount } from 'svelte';
	import { format } from 'date-fns';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';

	// ── Config ──────────────────────────────────────────────────────────────
	const EXPLORER_THRESHOLD_KM = 100;
	const HOME_KEY               = 'gendo_home';   // localStorage key
	const DISMISS_KEY            = 'gendo_explorer_dismissed';

	// ── Estado ──────────────────────────────────────────────────────────────
	type Suggestion = {
		id: number; title: string; type: string; dateStart: number;
		price: string | null; priceAmount: number | null;
		venueName: string | null; sourceUrl: string | null;
	};
	type NearestCity = { id: number; name: string; country: string; state: string | null };
	type ContextMsg   = { category: string; activityLabel: string; count: number };

	let state: 'idle' | 'requesting' | 'loading' | 'explorer' | 'home' | 'no_data' | 'denied' | 'error' = 'idle';
	let distanceKm    = 0;
	let nearestCity: NearestCity | null = null;
	let suggestions:  Suggestion[]  = [];
	let contextMsgs:  ContextMsg[]  = [];
	let homeCity      = '';          // nombre legible de la ciudad de origen
	let dismissed     = false;
	let expanded      = true;

	// ── Emojis y colores por categoría (sincronizados con +page.svelte) ─────
	const typeEmoji: Record<string, string> = {
		pesca: '🐟', ciclismo: '🚲', yoga: '🧘', social: '🍹',
		live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂',
		festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅',
	};
	const typeLabel: Record<string, string> = {
		pesca: 'Pesca', ciclismo: 'Ciclismo', yoga: 'Yoga & Zen', social: 'Social & Bares',
		live_music: 'Live Music', theater: 'Theater', sports: 'Sports', comedy: 'Comedy',
		festival: 'Festival', food: 'Food & Drink', art: 'Art', cinema: 'Cinema', other: 'Events',
	};
	const typeDotColor: Record<string, string> = {
		pesca: 'bg-blue-400', ciclismo: 'bg-green-400', yoga: 'bg-purple-400', social: 'bg-orange-400',
		live_music: 'bg-pink-400', theater: 'bg-rose-400', sports: 'bg-yellow-400', comedy: 'bg-amber-400',
		festival: 'bg-fuchsia-400', food: 'bg-lime-400', art: 'bg-teal-400', cinema: 'bg-sky-400', other: 'bg-gray-400',
	};
	const typeBadge: Record<string, string> = {
		pesca: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
		ciclismo: 'bg-green-500/15 text-green-300 border border-green-500/30',
		yoga: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
		social: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
		live_music: 'bg-pink-500/15 text-pink-300 border border-pink-500/30',
		food: 'bg-lime-500/15 text-lime-300 border border-lime-500/30',
		art: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
		sports: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
		festival: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30',
		theater: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
		comedy: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
		cinema: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
		other: 'bg-gray-500/15 text-gray-300 border border-gray-500/30',
	};

	// ── Haversine (misma fórmula que el backend) ─────────────────────────────
	function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371, r = Math.PI / 180;
		const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
		const a = Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.asin(Math.sqrt(a));
	}

	function formatDate(ms: number) {
		const d = new Date(ms);
		const today = new Date();
		if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return `Hoy · ${format(d, 'h:mm a')}`;
		return format(d, 'MMM d · h:mm a');
	}

	// ── Lógica principal ─────────────────────────────────────────────────────
	async function checkExplorerMode() {
		if (typeof window === 'undefined' || !navigator.geolocation) return;
		if (localStorage.getItem(DISMISS_KEY)) { dismissed = true; return; }

		state = 'requesting';

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const { latitude: curLat, longitude: curLng } = pos.coords;
				state = 'loading';

				// Leer casa desde localStorage
				let homeLat: number | null = null;
				let homeLng: number | null = null;
				const stored = localStorage.getItem(HOME_KEY);
				if (stored) {
					try {
						const h = JSON.parse(stored);
						homeLat = h.lat; homeLng = h.lng;
						homeCity = h.cityName ?? '';
					} catch { /* ignore */ }
				}

				// Si no hay casa guardada, guardar posición actual como casa
				if (homeLat === null || homeLng === null) {
					// Primero obtenemos el nombre de la ciudad actual
					const res = await fetch(`/api/geo?lat=${curLat}&lng=${curLng}`);
					if (!res.ok) { state = 'error'; return; }
					const data = await res.json();

					homeLat = curLat; homeLng = curLng;
					homeCity = data.nearestCity?.name ?? '';
					localStorage.setItem(HOME_KEY, JSON.stringify({ lat: homeLat, lng: homeLng, cityName: homeCity }));

					// Guardar en perfil si hay sesión de login
					fetch('/api/geo', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ lat: homeLat, lng: homeLng }),
					}).catch(() => {});

					state = 'home';
					return;
				}

				// Calcular distancia en el frontend
				const dist = haversineKm(homeLat, homeLng, curLat, curLng);
				distanceKm = Math.round(dist);

				if (dist <= EXPLORER_THRESHOLD_KM) {
					state = 'home'; // cerca de casa, no activar modo explorador
					return;
				}

				// Lejos de casa → pedir sugerencias al backend
				const res = await fetch(`/api/geo?lat=${curLat}&lng=${curLng}`);
				if (!res.ok) { state = 'error'; return; }
				const data = await res.json();

				if (!data.nearestCity) { state = 'no_data'; return; }

				nearestCity  = data.nearestCity;
				suggestions  = data.suggestions ?? [];
				contextMsgs  = data.contextMessages ?? [];
				state        = 'explorer';
			},
			(err) => {
				// Permiso denegado o error de geo
				if (err.code === 1) { state = 'denied'; }
				else { state = 'idle'; }
			},
			{ timeout: 10000, maximumAge: 5 * 60 * 1000 } // cache 5 min
		);
	}

	function dismiss() {
		dismissed = true;
		localStorage.setItem(DISMISS_KEY, '1');
	}

	function resetHome() {
		localStorage.removeItem(HOME_KEY);
		localStorage.removeItem(DISMISS_KEY);
		dismissed = false;
		state = 'idle';
		checkExplorerMode();
	}

	onMount(checkExplorerMode);
</script>

<!-- Solo muestra algo si está en modo explorador y no fue descartado -->
{#if !dismissed && state === 'explorer' && nearestCity}
	<section class="mb-10">
		<!-- Banner principal -->
		<div class="relative overflow-hidden bg-gradient-to-br from-amber-950/80 via-orange-950/60 to-gray-900 border border-amber-600/40 rounded-2xl">
			<!-- Fondo decorativo -->
			<div class="absolute inset-0 pointer-events-none">
				<div class="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>
				<div class="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
			</div>

			<div class="relative p-5">
				<!-- Header -->
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0">
							🧭
						</div>
						<div>
							<div class="flex items-center gap-2 flex-wrap">
								<h2 class="text-lg font-bold text-white">Modo Explorador</h2>
								<span class="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
									{distanceKm} km de casa
								</span>
							</div>
							<p class="text-amber-200/70 text-sm mt-0.5">
								Estás en <strong class="text-amber-200">{nearestCity.name}</strong>
								{nearestCity.state ? `, ${nearestCity.state}` : ''} —
								basado en tus gustos, esto te puede interesar 👇
							</p>
						</div>
					</div>
					<div class="flex items-center gap-1 flex-shrink-0">
						<button
							on:click={() => expanded = !expanded}
							class="text-gray-400 hover:text-white transition-colors p-1 rounded"
							title={expanded ? 'Colapsar' : 'Expandir'}
						>
							{expanded ? '▲' : '▼'}
						</button>
						<button
							on:click={dismiss}
							class="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
							title="Cerrar"
						>✕</button>
					</div>
				</div>

				{#if expanded}
					<!-- Contexto: qué le gusta + qué encontró aquí -->
					{#if contextMsgs.length > 0}
						<div class="mt-4 flex flex-wrap gap-2">
							{#each contextMsgs as ctx}
								<div class="flex items-center gap-1.5 bg-black/30 rounded-xl px-3 py-1.5 text-sm border border-white/10">
									<span>{typeEmoji[ctx.category] ?? '📅'}</span>
									<span class="text-gray-300">
										Te gusta <strong class="text-white">{typeLabel[ctx.category] ?? ctx.category}</strong>
										→ <span class="text-amber-300">{ctx.count} {ctx.activityLabel} aquí</span>
									</span>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Sugerencias de eventos -->
					{#if suggestions.length > 0}
						<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{#each suggestions as ev}
								<a
									href={ev.sourceUrl ? ev.sourceUrl : `/event/${ev.id}`}
									target={ev.sourceUrl ? '_blank' : '_self'}
									rel="noopener noreferrer"
									class="group bg-black/30 hover:bg-black/50 border border-white/10 hover:border-amber-500/40 rounded-xl p-3.5 transition-all"
								>
									<div class="flex items-start gap-2.5">
										<!-- Icono categoría -->
										<div class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg {typeBadge[ev.type] ?? typeBadge['other']}">
											{typeEmoji[ev.type] ?? '📅'}
										</div>
										<div class="flex-1 min-w-0">
											<h3 class="text-sm font-medium text-white group-hover:text-amber-300 transition-colors line-clamp-2">
												{cleanEventTitle(ev.title, nearestCity?.name)}
											</h3>
											<div class="flex items-center gap-1.5 mt-1 flex-wrap">
												<span class="text-xs px-1.5 py-0.5 rounded-full {typeBadge[ev.type] ?? typeBadge['other']}">
													{typeEmoji[ev.type]} {typeLabel[ev.type] ?? ev.type}
												</span>
												{#if ev.price === 'free'}
													<span class="text-xs text-green-400 font-medium">FREE</span>
												{:else if ev.priceAmount}
													<span class="text-xs text-yellow-400">${ev.priceAmount}</span>
												{/if}
											</div>
											<p class="text-amber-300/70 text-xs mt-1">{formatDate(ev.dateStart)}</p>
											{#if ev.venueName}
												<p class="text-gray-500 text-xs mt-0.5 truncate">📍 {cleanVenueName(ev.venueName, nearestCity?.name)}</p>
											{/if}
										</div>
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<div class="mt-4 text-center py-6 text-gray-500 text-sm">
							<p class="text-2xl mb-2">🔍</p>
							<p>No encontramos eventos de tus categorías favoritas en {nearestCity.name} aún.</p>
							<p class="text-xs mt-1">Prueba explorar la ciudad manualmente.</p>
						</div>
					{/if}

					<!-- Footer con opción de resetear casa -->
					<div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
						<p class="text-xs text-gray-600">
							🏠 Tu casa está registrada · <button on:click={resetHome} class="text-gray-500 hover:text-amber-400 underline transition-colors">Cambiar ubicación de casa</button>
						</p>
						<a
							href="/city/{nearestCity.name.toLowerCase().replace(/\s+/g, '-')}"
							class="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
						>
							Ver todo en {nearestCity.name} →
						</a>
					</div>
				{/if}
			</div>
		</div>
	</section>
{/if}

<!-- Indicador sutil cuando está detectando ubicación -->
{#if state === 'requesting' || state === 'loading'}
	<div class="mb-6 flex items-center gap-2 text-xs text-gray-600">
		<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
		</svg>
		{state === 'requesting' ? 'Detectando ubicación...' : 'Buscando actividades cerca de ti...'}
	</div>
{/if}
