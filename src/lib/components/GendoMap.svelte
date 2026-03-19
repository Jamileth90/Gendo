<script lang="ts">
	/**
	 * GendoMap — Mapa interactivo con pines de colores por categoría.
	 * Usa Leaflet + OpenStreetMap (completamente gratuito, sin API key).
	 *
	 * Props:
	 *   places     — lista de lugares con lat/lng y categoría
	 *   userLat    — latitud del usuario (pin azul central)
	 *   userLng    — longitud del usuario
	 *   height     — altura del contenedor (default 420px)
	 *   emitBounds — si true, emite evento 'bounds' al cargar y al mover/zoom (debounced)
	 */
	import { createEventDispatcher } from 'svelte';
	import { onMount, onDestroy } from 'svelte';

	export let places:  Array<{
		id: string; title: string; category: string; type: string;
		lat: number | null; lng: number | null; address: string;
		rating: number | null; reviews: number;
		googleCat: string | null;
		style: { emoji: string; label: string; mapPin: string };
	}> = [];
	export let userLat:  number | null = null;
	export let userLng:  number | null = null;
	export let height    = '420px';
	export let emitBounds = false;

	const dispatch = createEventDispatcher<{ bounds: { swLat: number; swLng: number; neLat: number; neLng: number } }>();

	// Colores del mapa por categoría (sinc. con classify.ts)
	const PIN_COLOR: Record<string, string> = {
		agua:   '#3b82f6',   // 🔵
		verde:  '#22c55e',   // 🟢
		zen:    '#a855f7',   // 🟣
		social: '#f97316',   // 🟠
	};

	let mapEl: HTMLDivElement;
	let map: import('leaflet').Map | null = null;
	let L: typeof import('leaflet') | null = null;
	let boundsTimeout: ReturnType<typeof setTimeout> | null = null;

	function emitMapBounds() {
		if (!map || !L || !emitBounds) return;
		const b = map.getBounds();
		const sw = b.getSouthWest();
		const ne = b.getNorthEast();
		dispatch('bounds', {
			swLat: sw.lat,
			swLng: sw.lng,
			neLat: ne.lat,
			neLng: ne.lng,
		});
	}

	function scheduleBoundsEmit() {
		if (!emitBounds) return;
		if (boundsTimeout) clearTimeout(boundsTimeout);
		boundsTimeout = setTimeout(() => {
			emitMapBounds();
			boundsTimeout = null;
		}, 350);
	}

	function makeIcon(color: string, emoji: string) {
		const svg = `
			<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
				<path d="M17 0C7.6 0 0 7.6 0 17c0 13 17 25 17 25S34 30 34 17C34 7.6 26.4 0 17 0z"
				      fill="${color}" stroke="white" stroke-width="2"/>
				<text x="17" y="23" text-anchor="middle" font-size="14">${emoji}</text>
			</svg>`.trim();

		return L!.divIcon({
			html:      `<div style="width:34px;height:42px">${svg}</div>`,
			iconSize:  [34, 42],
			iconAnchor:[17, 42],
			popupAnchor:[0, -40],
			className: '',
		});
	}

	function makeUserIcon() {
		const svg = `
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
				<circle cx="10" cy="10" r="8" fill="#6366f1" stroke="white" stroke-width="2"/>
				<circle cx="10" cy="10" r="3" fill="white"/>
			</svg>`.trim();
		return L!.divIcon({
			html:       `<div style="width:20px;height:20px">${svg}</div>`,
			iconSize:   [20, 20],
			iconAnchor: [10, 10],
			className:  '',
		});
	}

	// Puntos con coordenadas válidas
	$: validPlaces = places.filter(p => p.lat != null && p.lng != null);

	onMount(async () => {
		// Leaflet solo funciona en el navegador
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		// Default: Cedar Rapids, IA (ciudad principal de Gendo)
		const CEDAR_RAPIDS_LAT = 41.9779;
		const CEDAR_RAPIDS_LNG = -91.6656;
		const centerLat = userLat ?? validPlaces[0]?.lat ?? CEDAR_RAPIDS_LAT;
		const centerLng = userLng ?? validPlaces[0]?.lng ?? CEDAR_RAPIDS_LNG;

		map = L.map(mapEl, { zoomControl: true }).setView([centerLat, centerLng], 13);

		// Tiles OpenStreetMap — gratis, sin API key
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19,
		}).addTo(map);

		// Pin del usuario
		if (userLat != null && userLng != null) {
			L.marker([userLat, userLng], { icon: makeUserIcon() })
				.addTo(map)
				.bindPopup('<b>📍 Tú estás aquí</b>');
		}

		// Pines de lugares descubiertos
		for (const p of validPlaces) {
			const color = PIN_COLOR[p.category] ?? '#6b7280';
			const emoji = p.style?.emoji ?? '📍';
			const stars = p.rating ? `⭐ ${p.rating.toFixed(1)}` : '';
			const cat   = p.googleCat ?? p.style?.label ?? p.category;

			L.marker([p.lat!, p.lng!], { icon: makeIcon(color, emoji) })
				.addTo(map)
				.bindPopup(`
					<div style="min-width:180px;font-family:sans-serif">
						<b style="font-size:14px">${p.title}</b><br/>
						<span style="color:#6b7280;font-size:12px">${cat}</span><br/>
						${stars ? `<span style="font-size:12px">${stars} · ${p.reviews} reseñas</span><br/>` : ''}
						${p.address ? `<span style="font-size:11px;color:#9ca3af">📍 ${p.address}</span>` : ''}
					</div>
				`);
		}

		// Ajustar vista para incluir todos los puntos
		if (validPlaces.length > 1) {
			const bounds = L.latLngBounds(validPlaces.map(p => [p.lat!, p.lng!]));
			if (userLat != null && userLng != null) bounds.extend([userLat, userLng]);
			map.fitBounds(bounds, { padding: [40, 40] });
		}

		if (emitBounds) {
			map.on('moveend', scheduleBoundsEmit);
			map.on('zoomend', scheduleBoundsEmit);
			emitMapBounds();
		}
	});

	onDestroy(() => {
		if (boundsTimeout) clearTimeout(boundsTimeout);
		if (map) {
			map.off('moveend', scheduleBoundsEmit);
			map.off('zoomend', scheduleBoundsEmit);
			map.remove();
		}
		map = null;
	});

	// Actualizar pines cuando cambian los lugares
	$: if (map && L && validPlaces.length > 0) {
		// Limpiar capas de marcadores (no el tile layer)
		map.eachLayer(layer => {
			if ((layer as unknown as { _icon?: unknown })._icon) map!.removeLayer(layer);
		});
		if (userLat != null && userLng != null) {
			L.marker([userLat, userLng], { icon: makeUserIcon() })
				.addTo(map)
				.bindPopup('<b>📍 Tú estás aquí</b>');
		}
		for (const p of validPlaces) {
			const color = PIN_COLOR[p.category] ?? '#6b7280';
			const emoji = p.style?.emoji ?? '📍';
			L.marker([p.lat!, p.lng!], { icon: makeIcon(color, emoji) })
				.addTo(map)
				.bindPopup(`<b>${p.title}</b><br/>${p.googleCat ?? p.category}`);
		}
	}
</script>

<div
	bind:this={mapEl}
	style="height:{height}; width:100%; border-radius:1rem; overflow:hidden; position:relative; z-index:0;"
	class="bg-gendo-muted border border-white/[0.06]"
/>

<!-- Leyenda -->
<div class="flex flex-wrap gap-3 mt-2 px-1">
	{#each [['agua','#3b82f6','🐟','Agua y Pesca'],['verde','#22c55e','🚲','Naturaleza'],['zen','#a855f7','🧘','Bienestar'],['social','#f97316','🎉','Social']] as [cat,color,emoji,label]}
		<div class="flex items-center gap-1.5 text-xs text-gray-400">
			<span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{color}"></span>
			{emoji} {label}
		</div>
	{/each}
	<div class="flex items-center gap-1.5 text-xs text-gray-400">
		<span class="w-3 h-3 rounded-full bg-gendo-accent flex-shrink-0"></span>
		📍 Tu ubicación
	</div>
</div>
