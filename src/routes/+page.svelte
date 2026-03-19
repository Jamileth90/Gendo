<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { goto } from '$app/navigation';

	export let data: PageData;

	// ── Mapa de colores: 4 categorías globales ───────────────────────────────
	// 🔵 Agua  🟢 Verde  🟣 Zen  🟠 Social  — más tipos específicos heredan el color
	const typeEmoji: Record<string, string> = {
		// Categorías globales principales
		pesca:       '🐟',   playa:    '🏖️',  agua:    '🐟',
		ciclismo:    '🚲',   outdoor:  '🌿',  verde:   '🚲',
		yoga:        '🧘',   zen:      '🧘',
		social:      '🎉',
		// Tipos específicos
		live_music:  '🎵',  theater:  '🎭',  sports:   '🏟️',  comedy:  '😂',
		festival:    '🎪',  food:     '🍽️',  art:      '🎨',  cinema:  '🎬',
		cultura:     '🏛️',  gastronomia: '🍴',
		other:       '📅',
	};

	const typeLabel: Record<string, string> = {
		pesca:      'Agua y Pesca',   playa:     'Playas',       agua:    'Agua y Pesca',
		ciclismo:   'Parques y Bici', outdoor:   'Al Aire Libre', verde:  'Parques y Bici',
		yoga:       'Yoga y Bienestar', zen:     'Bienestar',
		social:     'Social y Eventos',
		live_music: 'Música en Vivo', theater:   'Teatro',       sports:  'Deportes',
		comedy:     'Comedia',        festival:  'Festival',     food:    'Gastronomía',
		art:        'Arte',           cinema:    'Cine',
		cultura:    'Cultura',        gastronomia: 'Gastronomía',
		other:      'Eventos',
	};

	// ── Colores por categoría (4 colores principales, el resto hereda) ────────
	const COLOR_AGUA   = { badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',     active: 'bg-blue-600 text-white',     dot: 'bg-blue-400'   };
	const COLOR_VERDE  = { badge: 'bg-green-500/15 text-green-300 border border-green-500/30',  active: 'bg-green-600 text-white',    dot: 'bg-green-400'  };
	const COLOR_ZEN    = { badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/30', active: 'bg-purple-600 text-white', dot: 'bg-purple-400' };
	const COLOR_SOCIAL = { badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/30', active: 'bg-orange-500 text-white', dot: 'bg-orange-400' };
	const COLOR_OTHER  = { badge: 'bg-gray-500/15 text-gray-300 border border-gray-500/30',     active: 'bg-gray-600 text-white',     dot: 'bg-gray-400'   };

	const typeColor: Record<string, { badge: string; active: string; dot: string }> = {
		// 🔵 Azul — Agua
		pesca: COLOR_AGUA,  playa: COLOR_AGUA,  agua: COLOR_AGUA,
		// 🟢 Verde — Parques y Bici
		ciclismo: COLOR_VERDE, outdoor: COLOR_VERDE, verde: COLOR_VERDE,
		sports:  { badge: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30', active: 'bg-yellow-500 text-white', dot: 'bg-yellow-400' },
		// 🟣 Morado — Yoga y Bienestar
		yoga: COLOR_ZEN, zen: COLOR_ZEN,
		// 🟠 Naranja — Social y Eventos
		social:    COLOR_SOCIAL,
		live_music:{ badge: 'bg-pink-500/15 text-pink-300 border border-pink-500/30',      active: 'bg-pink-600 text-white',    dot: 'bg-pink-400'    },
		comedy:    { badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',   active: 'bg-amber-500 text-white',   dot: 'bg-amber-400'   },
		festival:  { badge: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30', active: 'bg-fuchsia-600 text-white', dot: 'bg-fuchsia-400' },
		// Resto
		theater:    { badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',    active: 'bg-rose-600 text-white',    dot: 'bg-rose-400'    },
		food:       { badge: 'bg-lime-500/15 text-lime-300 border border-lime-500/30',    active: 'bg-lime-600 text-white',    dot: 'bg-lime-400'    },
		art:        { badge: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',    active: 'bg-teal-600 text-white',    dot: 'bg-teal-400'    },
		cinema:     { badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',       active: 'bg-sky-600 text-white',     dot: 'bg-sky-400'     },
		cultura:    { badge: 'bg-amber-500/15 text-amber-200 border border-amber-500/30', active: 'bg-amber-600 text-white',   dot: 'bg-amber-400'   },
		gastronomia:{ badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',    active: 'bg-rose-600 text-white',    dot: 'bg-rose-400'    },
		other:      COLOR_OTHER,
	};

	function getCategoryBadge(type: string) {
		return typeColor[type] ?? COLOR_OTHER;
	}

	// ── GPS: ciudad más cercana ───────────────────────────────────────────────
	let detectedCity: string | null = null;
	let detectingCity = false;

	function haversineKmClient(lat1: number, lng1: number, lat2: number, lng2: number) {
		const R = 6371, r = Math.PI / 180;
		const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
		const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
		return R * 2 * Math.asin(Math.sqrt(a));
	}

	function findNearestCity(lat: number, lng: number) {
		let best: { name: string; dist: number } | null = null;
		for (const city of data.cities) {
			if (city.lat == null || city.lng == null) continue;
			const d = haversineKmClient(lat, lng, city.lat, city.lng);
			if (!best || d < best.dist) best = { name: city.name, dist: d };
		}
		// Solo auto-seleccionar si la ciudad está a menos de 150 km
		return best && best.dist < 150 ? best.name : null;
	}

	// Search
	let searchQuery = '';
	let suggestions: Array<{ id: number; title: string; type: string; date_start: number; city_name: string | null }> = [];
	let showSuggestions = false;
	let searchTimeout: ReturnType<typeof setTimeout>;

	// Filter
	let selectedType = 'all';
	let selectedCity = '';
	// Filtro de tiempo: urgencia (qué hacer ahora)
	type TimeFilter = 'all' | 'today' | 'tomorrow' | 'weekend';
	let timeFilter: TimeFilter = 'all';
	// Filtro de ubicación inteligente: ciudad, país o pueblo según lo que busque el usuario
	let locationFilter: { type: 'city' | 'country'; name: string; country?: string } | null = null;
	let locationSearch = '';
	let locationSuggestions: Array<{ name: string; country: string; countryCode: string; placeType: string }> = [];
	let showLocationSuggestions = false;
	let locationSearchTimeout: ReturnType<typeof setTimeout>;

	// Modo "Cerca de mí": borra filtro de ciudad y muestra solo eventos a X km
	const NEAR_ME_RADIUS_KM = 10;
	let nearMeMode = false;
	let nearMeLoading = false;
	let nearMeError = '';

	// ── Geo-bonus client-side (< 5 km) ──────────────────────────────────────
	let userLat: number | null = null;
	let userLng: number | null = null;
	let nearbyBonus    = new Map<number, number>();
	let eventDistances = new Map<number, number>();

	function computeGeoBonus(distKm: number): number {
		if (distKm <  1) return 35;
		if (distKm <  5) return 25;
		if (distKm < 10) return 10;
		return 0;
	}

	function applyGeoBonus(lat: number, lng: number) {
		const bonusMap = new Map<number, number>();
		const distMap  = new Map<number, number>();
		for (const ev of data.upcoming) {
			if (ev.venueLat != null && ev.venueLng != null) {
				const dist = haversineKmClient(lat, lng, ev.venueLat, ev.venueLng);
				distMap.set(ev.id, dist);
				const bonus = computeGeoBonus(dist);
				if (bonus > 0) bonusMap.set(ev.id, bonus);
			}
		}
		nearbyBonus    = bonusMap;
		eventDistances = distMap;
	}

	// Lista con geo-bonus aplicado y re-ordenada
	$: geoRanked = data.upcoming
		.map(ev => ({
			...ev,
			// Suma el bonus de proximidad al score del servidor
			totalScore: ev.score + (nearbyBonus.get(ev.id) ?? 0),
			distKm:     eventDistances.get(ev.id) ?? null,
			isNearby:   (nearbyBonus.get(ev.id) ?? 0) >= 25,  // < 5 km
		}))
		.sort((a, b) => b.totalScore - a.totalScore || a.dateStart - b.dateStart);

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

	$: filteredEvents = eventsSource.filter(ev => {
		const matchType = selectedType === 'all' || ev.type === selectedType;
		const matchTime = eventMatchesTime(ev, timeFilter);
		// Modo "Cerca de mí": solo eventos dentro del radio (5–10 km)
		if (nearMeMode) {
			const dist = ev.distKm ?? eventDistances.get(ev.id);
			if (dist == null || dist > NEAR_ME_RADIUS_KM) return false;
			return matchType && matchTime;
		}
		let matchCity = true;
		if (locationFilter) {
			if (locationFilter.type === 'city')
				matchCity = (ev.cityName ?? '').toLowerCase().includes(locationFilter.name.toLowerCase());
			else
				matchCity = (ev.cityCountry ?? '').toLowerCase().includes((locationFilter.country ?? locationFilter.name).toLowerCase());
		} else if (selectedCity) {
			matchCity = (ev.cityName ?? '').toLowerCase().includes(selectedCity.toLowerCase());
		}
		return matchType && matchCity && matchTime;
	});

	// ── Eventos por viewport del mapa (bounding box) ───────────────────────────
	// Cuando el mapa emite bounds, usamos esos eventos en lugar de data.featured/upcoming
	let mapBounds: { swLat: number; swLng: number; neLat: number; neLng: number } | null = null;
	let boundsEvents: Array<{
		id: number; title: string; description: string | null; dateStart: number; dateEnd: number | null;
		type: string; price: string | null; priceAmount: number | null; venueName: string | null;
		venueLat: number | null; venueLng: number | null; cityName: string | null; cityState: string | null;
		cityCountry: string | null; imageUrl: string | null; featured: boolean; score?: number;
		rankReasons?: string[]; distKm?: number | null; isNearby?: boolean;
	}> = [];
	let boundsEventsLoading = false;

	async function fetchEventsByBounds(b: { swLat: number; swLng: number; neLat: number; neLng: number }) {
		mapBounds = b;
		boundsEventsLoading = true;
		try {
			const q = new URLSearchParams({
				swLat: String(b.swLat),
				swLng: String(b.swLng),
				neLat: String(b.neLat),
				neLng: String(b.neLng),
			});
			const res = await fetch(`/api/events/by-bounds?${q}`);
			const d = await res.json();
			if (res.ok && Array.isArray(d.events)) {
				boundsEvents = d.events.map((ev: Record<string, unknown>) => ({
					...ev,
					score: 0,
					rankReasons: [] as string[],
					distKm: userLat != null && userLng != null && ev.venueLat != null && ev.venueLng != null
						? haversineKmClient(userLat, userLng, ev.venueLat as number, ev.venueLng as number)
						: null,
					isNearby: false,
				}));
				// Aplicar geo bonus a boundsEvents
				if (userLat != null && userLng != null) {
					boundsEvents = boundsEvents.map(ev => {
						const dist = ev.venueLat != null && ev.venueLng != null
							? haversineKmClient(userLat!, userLng!, ev.venueLat!, ev.venueLng!)
							: null;
						const bonus = dist != null ? computeGeoBonus(dist) : 0;
						return {
							...ev,
							distKm: dist,
							isNearby: bonus >= 25,
							score: (ev.score ?? 0) + bonus,
						};
					});
				}
			} else {
				boundsEvents = [];
			}
		} catch {
			boundsEvents = [];
		} finally {
			boundsEventsLoading = false;
		}
	}

	function onMapBounds(e: CustomEvent<{ swLat: number; swLng: number; neLat: number; neLng: number }>) {
		fetchEventsByBounds(e.detail);
	}

	// Featured: si hay mapBounds, usar boundsEvents.featured; si no, todos los data.featured
	$: featuredNearby = (() => {
		if (mapBounds && boundsEvents.length > 0) {
			return boundsEvents.filter(ev => ev.featured);
		}
		return data.featured;
	})();

	// Base para All Events: si hay mapBounds, usar boundsEvents (ordenados por fecha); si no, geoRanked
	$: eventsSource = (() => {
		if (mapBounds != null) {
			return [...boundsEvents].sort((a, b) => a.dateStart - b.dateStart || (a.score ?? 0) - (b.score ?? 0));
		}
		return geoRanked;
	})();

	// ── Badges de ranking ────────────────────────────────────────────────────
	const { timeSlot, timeSlotLabel, hasPreferences, persona } = data.rankingContext;

	// Etiquetas cortas para badges (evitar apretar cuando hay muchas categorías)
	const PERSONA_LABELS: Record<string, string> = {
		naturaleza: '🌿 Naturaleza',
		noche:      '🌙 Noche',
		cultura:    '🎭 Cultura',
		zen:        '🧘 Zen',
	};

	const TIME_SLOT_CATEGORIES: Record<string, string[]> = {
		morning:   ['yoga', 'ciclismo', 'sports', 'pesca'],
		afternoon: ['food', 'art', 'sports', 'festival'],
		evening:   ['live_music', 'food', 'social', 'festival'],
		night:     ['social', 'live_music', 'comedy'],
	};

	function getRankBadge(ev: {
		rankReasons: string[];
		type: string;
		isNearby?: boolean;
		distKm?: number | null;
		isStarOfDay?: boolean;
		starLabel?: string | null;
	}) {
		const reasons      = ev.rankReasons ?? [];
		const isPreference = reasons.includes('preference');
		const isPersona    = reasons.includes('persona');
		const isTime       = reasons.includes('time');
		const nearby       = ev.isNearby ?? false;
		const timeCategories = TIME_SLOT_CATEGORIES[timeSlot] ?? [];
		const isTimeMatch  = isTime && timeCategories.includes(ev.type);

		// ⭐ Estrella del Día — máxima prioridad visual
		if (ev.isStarOfDay)
			return {
				label:    `⭐ Estrella del Día`,
				sublabel: ev.starLabel ?? undefined,
				cls:      'bg-amber-400/20 text-amber-200 border-amber-400/50',
				star:     true,
			};

		// Prioridad: nearby > (preferencia + persona) > tiempo solo
		if (nearby && (isPreference || isPersona))
			return { label: `📍 Cerca · 🎯 Para ti`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', star: false };
		if (nearby)
			return { label: ev.distKm != null ? `📍 A ${ev.distKm < 1 ? '<1' : ev.distKm.toFixed(1)} km` : '📍 Cerca de ti', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', star: false };
		if (isPersona && isPreference)
			return { label: `🎯 ${PERSONA_LABELS[persona] ?? 'Para ti'}`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', star: false };
		if (isPersona)
			return { label: PERSONA_LABELS[persona] ?? '🎯 Para ti', cls: 'bg-gendo-accent/20 text-gendo-accent border-gendo-accent/30', star: false };
		if (isPreference && isTimeMatch)
			return { label: '🎯 Para ti · ' + timeSlotLabel.split(' ').slice(1).join(' '), cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', star: false };
		if (isPreference)
			return { label: '🎯 Basado en tus gustos', cls: 'bg-gendo-accent/20 text-gendo-accent border-gendo-accent/30', star: false };
		if (isTimeMatch)
			return { label: timeSlotLabel, cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', star: false };
		return null;
	}

	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		try { return JSON.parse(tags).slice(0, 3); } catch { return []; }
	}

	function formatPrice(ev: { price: string | null; priceAmount: number | null; currency: string | null }) {
		if (ev.price === 'free') return 'FREE';
		if (ev.priceAmount) return `$${ev.priceAmount}`;
		return ev.price === 'paid' ? 'Paid' : '';
	}

	function formatEventDate(ms: number) {
		const d = new Date(ms);
		const today = new Date();
		const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
		const df = format(d, 'yyyy-MM-dd');
		if (df === format(today, 'yyyy-MM-dd')) return `Today · ${format(d, 'h:mm a')}`;
		if (df === format(tomorrow, 'yyyy-MM-dd')) return `Tomorrow · ${format(d, 'h:mm a')}`;
		return format(d, 'MMM d · h:mm a');
	}

	async function onSearchInput() {
		clearTimeout(searchTimeout);
		if (searchQuery.length < 2) { suggestions = []; showSuggestions = false; return; }
		searchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&suggest=true`);
				if (res.ok) {
					const d = await res.json();
					suggestions = d.suggestions ?? [];
					showSuggestions = suggestions.length > 0;
				}
			} catch {}
		}, 200);
	}

	// Búsqueda inteligente de ubicación: ciudad, pueblo, país…
	async function onLocationSearchInput() {
		clearTimeout(locationSearchTimeout);
		if (locationSearch.length < 2) { locationSuggestions = []; showLocationSuggestions = false; return; }
		locationSearchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/geocode-city?q=${encodeURIComponent(locationSearch)}`);
				if (res.ok) {
					const d = await res.json();
					const raw = d.results ?? [];
					locationSuggestions = raw.map((r: { name: string; country: string; countryCode: string; placeType: string }) => ({
						name: r.name,
						country: r.country,
						countryCode: r.countryCode,
						placeType: r.placeType,
					}));
					showLocationSuggestions = locationSuggestions.length > 0;
				}
			} catch {} finally {}
		}, 300);
	}

	function selectLocation(s: { name: string; country: string; placeType: string }) {
		nearMeMode = false;
		nearMeError = '';
		const isCountry = s.placeType === 'country' || s.placeType === 'boundary' || s.name === s.country;
		locationFilter = {
			type: isCountry ? 'country' : 'city',
			name: s.name,
			country: s.country,
		};
		locationSearch = '';
		locationSuggestions = [];
		showLocationSuggestions = false;
	}

	function clearLocationFilter() {
		locationFilter = null;
		locationSearch = '';
		locationSuggestions = [];
		showLocationSuggestions = false;
		nearMeMode = false;
		nearMeError = '';
		mapBounds = null;
		boundsEvents = [];
	}

	async function toggleNearMe() {
		if (nearMeMode) {
			nearMeMode = false;
			nearMeError = '';
			return;
		}
		// Borrar filtros de ciudad
		locationFilter = null;
		locationSearch = '';
		locationSuggestions = [];
		selectedCity = '';
		showLocationSuggestions = false;
		nearMeError = '';
		if (userLat != null && userLng != null) {
			applyGeoBonus(userLat, userLng);
			nearMeMode = true;
			return;
		}
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			nearMeError = 'Tu navegador no soporta geolocalización';
			return;
		}
		nearMeLoading = true;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				userLat = coords.latitude;
				userLng = coords.longitude;
				applyGeoBonus(coords.latitude, coords.longitude);
				nearMeMode = true;
				nearMeLoading = false;
			},
			() => {
				nearMeError = 'No se pudo obtener tu ubicación. Revisa los permisos.';
				nearMeLoading = false;
			},
			{ timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
		);
	}

	function goToEvent(id: number) {
		showSuggestions = false;
		goto(`/event/${id}`);
	}

	function getDirectionsUrl(ev: { venueLat?: number | null; venueLng?: number | null; venueName?: string | null; venueAddress?: string | null; cityName?: string | null }) {
		const destQuery = encodeURIComponent([ev.venueAddress, ev.venueName, ev.cityName].filter(Boolean).join(', ') || '');
		const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
		const hasOrigin = userLat != null && userLng != null;
		if (ev.venueLat != null && ev.venueLng != null) {
			if (isIOS) {
				return hasOrigin
					? `https://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${ev.venueLat},${ev.venueLng}`
					: `https://maps.apple.com/?daddr=${ev.venueLat},${ev.venueLng}`;
			}
			const params = new URLSearchParams({ api: '1', destination: `${ev.venueLat},${ev.venueLng}` });
			if (hasOrigin) params.set('origin', `${userLat},${userLng}`);
			return `https://www.google.com/maps/dir/?${params}`;
		}
		if (isIOS) return `https://maps.apple.com/?q=${destQuery}`;
		return `https://www.google.com/maps/search/?api=1&query=${destQuery}`;
	}

	function openDirections(e: MouseEvent, ev: { venueLat?: number | null; venueLng?: number | null; venueName?: string | null; venueAddress?: string | null; cityName?: string | null }) {
		e.preventDefault();
		e.stopPropagation();
		window.open(getDirectionsUrl(ev), '_blank', 'noopener');
	}

	function goToCity(name: string) {
		goto(`/city/${name.toLowerCase().replace(/\s+/g, '-')}`);
	}

	// All event types from data
	const allTypes = [...new Set(data.upcoming.map(e => e.type))].sort();

	// ── Guardar en favoritos (corazón) ───────────────────────────────────────
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
				const data = await r.json();
				savedEventIds = new Set(data.eventIds ?? []);
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

	// ── Preferencias de usuario ──────────────────────────────────────────────
	interface PrefItem { category: string; click_count: number }
	let userPrefs: PrefItem[] = [];
	let totalClicks = 0;

	// Carga las preferencias al montar la página
	async function loadPrefs() {
		try {
			const res = await fetch('/api/preferences');
			if (res.ok) {
				const d = await res.json();
				userPrefs = d.prefs ?? [];
				totalClicks = d.total ?? 0;
			}
		} catch {}
	}

	// Registra un clic y actualiza el panel en tiempo real
	async function trackClick(category: string) {
		try {
			const res = await fetch('/api/preferences', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category }),
			});
			if (res.ok) {
				const d = await res.json();
				userPrefs = d.top ?? userPrefs;
				totalClicks += 1;
			}
		} catch {}
	}

	async function clearPrefs() {
		if (!confirm('¿Borrar tu historial de intereses?')) return;
		await fetch('/api/preferences', { method: 'DELETE' });
		userPrefs = [];
		totalClicks = 0;
	}

	// Porcentaje de cada categoría sobre el total
	function pct(count: number) {
		if (!totalClicks) return 0;
		return Math.round((count / totalClicks) * 100);
	}

	import { onMount } from 'svelte';
	import ExplorerMode       from '$lib/components/ExplorerMode.svelte';
	import GendoMap           from '$lib/components/GendoMap.svelte';
	import WorldSearchButton  from '$lib/components/WorldSearchButton.svelte';
	import { saveHomeCache }  from '$lib/offline';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';
	import { formatCityDisplay, formatEventCity } from '$lib/formatCity';
	import { getUserLang, translateBatch } from '$lib/translate';

	// ── Traducción según idioma del dispositivo ───────────────────────────────
	let userLang = 'en' as 'es' | 'en';
	let translatedTitles: Map<string, string> = new Map();
	$: if (typeof window !== 'undefined') {
		userLang = getUserLang();
	}
	$: toTranslate = (() => {
		const titles = new Set<string>();
		for (const ev of featuredNearby) {
			const t = cleanEventTitle(ev.title, ev.cityName);
			if (t && t.length > 2) titles.add(t);
		}
		for (const ev of filteredEvents.slice(0, 30)) {
			const t = cleanEventTitle(ev.title, ev.cityName);
			if (t && t.length > 2) titles.add(t);
		}
		return Array.from(titles);
	})();
	$: if (toTranslate.length > 0 && userLang) {
		translateBatch(toTranslate, userLang).then((translations) => {
			const m = new Map<string, string>();
			toTranslate.forEach((t, i) => m.set(t, translations[i] ?? t));
			translatedTitles = m;
		});
	}

	function t(title: string): string {
		return translatedTitles.get(title) ?? title;
	}

	// ── Mapa visual ──────────────────────────────────────────────────────────
	let showMap = false;

	// ── Notificaciones del navegador ──────────────────────────────────────────
	let notifPermission: NotificationPermission = 'default';

	async function requestNotifPermission() {
		if (!('Notification' in window)) return;
		notifPermission = await Notification.requestPermission();
	}

	function sendDiscoveryNotif(count: number, city: string) {
		if (notifPermission !== 'granted') return;
		const lastKey = `gendo_notif_${city}`;
		const last    = parseInt(localStorage.getItem(lastKey) ?? '0');
		// Solo notificar si no avisamos en las últimas 6 h
		if (Date.now() - last < 6 * 60 * 60 * 1000) return;
		localStorage.setItem(lastKey, String(Date.now()));
		new Notification('🔍 Gendo encontró algo nuevo', {
			body: `${count} lugares nuevos cerca de ${city}`,
			icon: '/favicon.png',
			tag:  'gendo-discovery',
		});
	}

	// ── Modo offline: caché en localStorage ──────────────────────────────────
	const OFFLINE_KEY  = 'gendo_offline_places';
	const OFFLINE_META = 'gendo_offline_meta';

	function saveOfflineCache(places: DiscoveredPlace[], lat: number, lng: number, city: string) {
		try {
			localStorage.setItem(OFFLINE_KEY,  JSON.stringify(places));
			localStorage.setItem(OFFLINE_META, JSON.stringify({ lat, lng, city, savedAt: Date.now() }));
		} catch {}
	}

	function loadOfflineCache(): { places: DiscoveredPlace[]; meta: { city: string; savedAt: number } } | null {
		try {
			const raw  = localStorage.getItem(OFFLINE_KEY);
			const meta = localStorage.getItem(OFFLINE_META);
			if (!raw || !meta) return null;
			const m = JSON.parse(meta) as { city: string; savedAt: number };
			// Caché offline válido por 48 h
			if (Date.now() - m.savedAt > 48 * 60 * 60 * 1000) return null;
			return { places: JSON.parse(raw), meta: m };
		} catch { return null; }
	}

	// ── Búsqueda por ciudad ──────────────────────────────────────────────────
	let citySearchLoading = false;

	function onCityDiscover(e: CustomEvent<{ lat: number; lng: number; cityName: string; countryCode: string }>) {
		const { lat, lng, cityName } = e.detail;
		userLat = lat;
		userLng = lng;
		callDiscover(lat, lng).then(() => {
			if (importStats && !discoveryCached) {
				sendDiscoveryNotif(discoveredPlaces.length, cityName);
			}
		});
	}

	onMount(() => {
		loadPrefs();
		loadSavedEvents();

		// Guardar eventos en caché para uso offline (direcciones, horarios)
		try {
			const toEv = (ev: Record<string, unknown>) => ({
				id: ev.id,
				title: ev.title,
				description: ev.description ?? null,
				dateStart: ev.dateStart,
				type: ev.type,
				price: ev.price ?? null,
				priceAmount: ev.priceAmount ?? null,
				currency: ev.currency ?? null,
				venueName: ev.venueName ?? null,
				venueAddress: ev.venueAddress ?? null,
				venueLat: ev.venueLat ?? null,
				venueLng: ev.venueLng ?? null,
				cityName: ev.cityName ?? null,
				cityState: ev.cityState ?? null,
				cityCountry: ev.cityCountry ?? null,
				sourceUrl: ev.sourceUrl ?? null,
				score: ev.score,
				rankReasons: ev.rankReasons,
				featured: ev.featured,
			});
			saveHomeCache({
				upcoming: data.upcoming.map((ev) => toEv(ev as Record<string, unknown>)),
				featured: data.featured.map((ev) => toEv(ev as Record<string, unknown>)),
				cities: data.cities.map((c) => ({
					id: c.id,
					name: c.name,
					countryCode: c.countryCode,
					state: c.state,
					event_count: c.event_count,
				})),
				rankingContext: data.rankingContext,
			});
		} catch {}

		// Inicializar permiso de notificaciones
		if ('Notification' in window) notifPermission = Notification.permission;

		// Cargar caché offline si no hay conexión o mientras llega el GPS
		const offline = loadOfflineCache();
		if (offline && discoveredPlaces.length === 0) {
			discoveredPlaces  = offline.places;
			discoveryCached   = true;
			discoveryCachedAt = offline.meta.savedAt;
		}

		if (typeof navigator === 'undefined' || !navigator.geolocation) return;

		detectingCity = true;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				userLat = coords.latitude;
				userLng = coords.longitude;
				applyGeoBonus(coords.latitude, coords.longitude);

				// Auto-detectar ciudad más cercana y filtrar automáticamente
				const nearest = findNearestCity(coords.latitude, coords.longitude);
				if (nearest) {
					detectedCity = nearest;
					selectedCity = nearest;
				}
				detectingCity = false;

				// Iniciar descubrimiento autónomo con Apify
				callDiscover(coords.latitude, coords.longitude).then(() => {
					// Guardar en caché offline
					if (discoveredPlaces.length > 0) {
						saveOfflineCache(discoveredPlaces, coords.latitude, coords.longitude, detectedCity ?? '');
					}
					// Notificar si hay lugares nuevos y se tiene permiso
					if (importStats && !discoveryCached && discoveredPlaces.length > 0) {
						sendDiscoveryNotif(discoveredPlaces.length, importStats.cityName);
					}
				});
			},
			() => { detectingCity = false; },
			{ timeout: 8000, maximumAge: 5 * 60 * 1000 }
		);
	});

	// ── Descubrimiento autónomo por GPS ──────────────────────────────────────
	interface DiscoveredPlace {
		id: string; title: string; category: string; type: string;
		lat: number | null; lng: number | null; address: string;
		rating: number | null; reviews: number;
		website: string | null; phone: string | null; googleCat: string | null;
		style: { emoji: string; label: string; badge: string; active: string; dot: string; mapPin: string };
		source: 'discovery';
	}
		let discoveredPlaces: DiscoveredPlace[] = [];
		let discovering      = false;
		let discoveryError   = '';
		let discoveryNeedsToken = false;
		let discoveryCached  = false;
	let discoveryCachedAt: number | null = null;
	// Filtro de categoría aplicado a la sección de descubrimiento
	let discoverFilter   = 'all';

	interface ImportStats {
		citiesCreated:  number;
		venuesUpserted: number;
		eventsUpserted: number;
		cityName:       string;
		countryCode:    string;
	}
	let importStats: ImportStats | null = null;

	// ── Top 6 ciudades del país/estado donde está el usuario ──────────────────
	// GPS detecta ciudad cercana (ej. Cedar Rapids en Iowa) → país y estado
	$: userLocation = (() => {
		if (detectedCity) {
			const c = data.cities.find(x => x.name === detectedCity);
			if (c) return { countryCode: c.countryCode, state: c.state };
		}
		if (importStats) return { countryCode: importStats.countryCode, state: null };
		return null;
	})();

	$: userCountryCode = userLocation?.countryCode ?? null;
	$: userState = userLocation?.state ?? null;

	$: topCities = (() => {
		const all = data.cities;
		// Deduplicar: UNA por (name, countryCode, state), la de mayor event_count
		const byKey = new Map<string, typeof all[0]>();
		for (const c of all) {
			const key = `${String(c?.name ?? '').trim().toLowerCase()}|${String(c?.countryCode ?? '').trim().toUpperCase()}|${String(c?.state ?? '').trim().toLowerCase()}`;
			const existing = byKey.get(key);
			const ec = Number(c?.event_count ?? 0);
			if (!existing || ec > Number(existing?.event_count ?? 0)) byKey.set(key, c);
		}
		const deduped = Array.from(byKey.values());

		// Prioridad: ciudades de TU estado (donde estás) > país > global
		if (userCountryCode) {
			if (userState) {
				// Solo ciudades de tu estado (normaliza NY vs "New York", etc.)
				const sameState = deduped.filter(c =>
					c.countryCode === userCountryCode && stateMatches(c.state, userState)
				);
				return sameState.slice(0, 6);
			}
			// Mismo país
			const sameCountry = deduped.filter(c =>
				(c.countryCode ?? '').toUpperCase() === (userCountryCode ?? '').toUpperCase()
			);
			return sameCountry.slice(0, 6);
		}

		return deduped.slice(0, 6);
	})();

	// Nombres de estados US para mostrar en lugar de siglas
	const US_STATE_NAMES: Record<string, string> = {
		IA:'Iowa', NY:'Nueva York', CA:'California', IL:'Illinois', FL:'Florida',
		TX:'Texas', OH:'Ohio', PA:'Pensilvania', MI:'Míchigan', GA:'Georgia',
		NC:'Carolina del Norte', NJ:'Nueva Jersey', VA:'Virginia', WA:'Washington',
		AZ:'Arizona', MA:'Massachusetts', TN:'Tennessee', IN:'Indiana', MO:'Misuri',
		MD:'Maryland', WI:'Wisconsin', CO:'Colorado', MN:'Minnesota', SC:'Carolina del Sur',
	};

	// Normaliza estado para comparar (NY = New York, IA = Iowa, etc.)
	const STATE_ABBREV: Record<string, string> = {
		...Object.fromEntries(Object.entries(US_STATE_NAMES).map(([k, v]) => [v.toUpperCase(), k])),
		'NEW YORK': 'NY', 'IOWA': 'IA', 'CALIFORNIA': 'CA', 'ILLINOIS': 'IL', 'FLORIDA': 'FL',
	};

	function stateMatches(a: string | null, b: string | null): boolean {
		if (!a || !b) return a === b;
		const na = a.trim().toUpperCase();
		const nb = b.trim().toUpperCase();
		if (na === nb) return true;
		const canonA = STATE_ABBREV[na] ?? na;
		const canonB = STATE_ABBREV[nb] ?? nb;
		return canonA === canonB;
	}

	$: topCitiesLabel = (() => {
		if (!userCountryCode) return '🔥 Ciudades más activas';
		const flag = (code: string) => {
			const offset = 0x1F1E6 - 0x41;
			return [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + offset)).join('');
		};
		if (userState) {
			const stateName = US_STATE_NAMES[userState] ?? userState;
			return `${flag(userCountryCode)} Ciudades en ${stateName}`;
		}
		const name = data.cities.find(c => c.countryCode === userCountryCode)?.country ?? userCountryCode;
		return `${flag(userCountryCode)} Ciudades en ${name}`;
	})();

	async function callDiscover(lat: number, lng: number) {
		discovering         = true;
		discoveryError      = '';
		discoveryNeedsToken = false;
		importStats         = null;
		mapBounds           = null;
		boundsEvents        = [];
		try {
			const res = await fetch('/api/discover', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ lat, lng }),
			});
			const d = await res.json();
			if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
			discoveredPlaces   = d.results   ?? [];
			discoveryCached    = d.cached    ?? false;
			discoveryCachedAt  = d.cachedAt  ?? null;
			discoveryNeedsToken = d.needsToken ?? false;
			importStats        = d.imported  ?? null;
			if (discoveredPlaces.length > 0) showMap = true;
		} catch (e: unknown) {
			discoveryError = e instanceof Error ? e.message : 'Error de conexión';
		} finally {
			discovering = false;
		}
	}

	$: discoverFiltered = discoverFilter === 'all'
		? discoveredPlaces
		: discoveredPlaces.filter(p => p.category === discoverFilter);

	// Actualización manual: todas las fuentes (Eventbrite, Meetup, Facebook, Instagram)
	let refreshing = false;
	let refreshMsg = '';
	let subscribeEmail = '';
	let subscribeStatus = ''; // 'success' | 'error' | ''
	let subscribeLoading = false;

	async function subscribe() {
		if (!subscribeEmail.trim() || subscribeLoading) return;
		subscribeLoading = true;
		subscribeStatus = '';
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: subscribeEmail.trim() }),
			});
			const d = await res.json();
			if (res.ok && d.success) {
				subscribeStatus = 'success';
				subscribeEmail = '';
			} else {
				subscribeStatus = 'error';
			}
		} catch {
			subscribeStatus = 'error';
		} finally {
			subscribeLoading = false;
		}
	}

	function scrollToExplore() {
		document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
	}

	async function refreshData() {
		if (refreshing) return;
		refreshing = true;
		refreshMsg = 'Actualizando Eventbrite, Meetup, Facebook e Instagram…';
		try {
			const res = await fetch('/api/refresh-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const d = await res.json();
			if (d.started) {
				refreshMsg = '✅ Actualizando en segundo plano (10–20 min). Recarga la página más tarde.';
			} else {
				refreshMsg = d.error ?? 'Ya hay una actualización en curso. Intenta más tarde.';
			}
		} catch {
			refreshMsg = 'Error — intenta de nuevo';
		}
		setTimeout(() => { refreshMsg = ''; refreshing = false; }, 8000);
	}
</script>

<svelte:head>
	<title>Gendo — What's Happening Near You</title>
	<meta name="description" content="Discover events, concerts, sports, food & more in any city worldwide." />
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">

	<!-- Hero — minimal, full viewport, responsive -->
	<div class="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
		<!-- Subtle warm orb -->
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-gendo-accent/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

		<div class="relative z-10 w-full max-w-xl text-center">
			<h1 class="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white mb-3 sm:mb-4">
				Gendo
			</h1>
			<p class="text-base sm:text-lg text-gendo-text-muted mb-8 sm:mb-10 font-normal">
				What's happening near you
			</p>

			<!-- Search — single focus, touch-friendly -->
			<div class="relative mb-6">
				<input
					bind:value={searchQuery}
					on:input={onSearchInput}
					on:focus={() => { if (suggestions.length > 0) showSuggestions = true; }}
					on:blur={() => setTimeout(() => showSuggestions = false, 200)}
					type="text"
					placeholder="Search events, concerts, cities..."
					class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 text-base sm:text-lg placeholder-zinc-500 focus:outline-none focus:border-gendo-accent/40 focus:bg-white/[0.06] transition-all min-h-[48px]"
				/>
				{#if showSuggestions}
					<div class="absolute top-full left-0 right-0 mt-2 bg-gendo-surface border border-white/[0.06] rounded-xl shadow-2xl z-50 overflow-hidden">
						{#each suggestions as s}
							<button
								on:click={() => goToEvent(s.id)}
								class="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] text-left transition-colors"
							>
								<span class="text-lg">{typeEmoji[s.type] ?? '📅'}</span>
								<div class="flex-1 min-w-0 text-left">
									<p class="text-white text-sm font-medium truncate">{s.title}</p>
									<p class="text-gray-500 text-xs">{s.city_name ?? ''} · {format(new Date(s.date_start * 1000), 'MMM d')}</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<button
				on:click={scrollToExplore}
				class="text-zinc-500 hover:text-gendo-accent text-sm font-medium transition-colors flex items-center gap-2 mx-auto py-3 min-h-[44px]"
			>
				Explore events
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
			</button>

			<!-- Subscribe — minimal, stacks on mobile -->
			<div class="mt-12 sm:mt-16 pt-12 sm:pt-16 border-t border-white/[0.06] w-full max-w-sm mx-auto">
				<p class="text-sm text-zinc-500 mb-3">Weekly event picks in your inbox</p>
				<form on:submit|preventDefault={subscribe} class="flex flex-col sm:flex-row gap-2">
					<input
						bind:value={subscribeEmail}
						type="email"
						placeholder="you@email.com"
						class="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 sm:py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-gendo-accent/40 min-h-[44px]"
					/>
					<button
						type="submit"
						disabled={subscribeLoading}
						class="px-5 py-3 sm:py-2.5 rounded-xl bg-gendo-cream text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors min-h-[44px]"
					>
						{subscribeLoading ? '...' : 'Notify me'}
					</button>
				</form>
				{#if subscribeStatus === 'success'}
					<p class="mt-2 text-sm text-emerald-400">You're in. We'll be in touch.</p>
				{:else if subscribeStatus === 'error'}
					<p class="mt-2 text-sm text-amber-400">Something went wrong. Try again.</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content — below the fold, responsive -->
	<div id="explore" class="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 scroll-mt-8">

		<!-- Quick stats + refresh (compact) -->
		<div class="flex flex-wrap items-center justify-between gap-4 mb-10">
			<div class="flex gap-6 text-sm text-zinc-500">
				<span><strong class="text-white">{data.stats.total_events}</strong> events</span>
				<span><strong class="text-white">{data.stats.total_cities}</strong> cities</span>
			</div>
			<button
				on:click={refreshData}
				disabled={refreshing}
				class="text-xs text-zinc-500 hover:text-gendo-accent disabled:opacity-50 transition-colors"
			>
				{refreshing ? 'Updating...' : '↻ Refresh data'}
			</button>
		</div>

		<!-- World search -->
		<div class="mb-10">
			<WorldSearchButton
				bind:notifPermission
				bind:citySearchLoading
				on:discover={onCityDiscover}
				on:click={requestNotifPermission}
			/>
		</div>

		<ExplorerMode />

		<!-- ── Descubrimiento Autónomo por GPS ──────────────────────────────── -->
		{#if discovering || discoveredPlaces.length > 0 || discoveryError || discoveryNeedsToken}
			<section class="mb-10">
				<div class="bg-gendo-surface border border-white/[0.06] rounded-2xl overflow-hidden">

					<!-- Cabecera -->
					<div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] gap-3 flex-wrap">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="text-xl">🔍</span>
							<h2 class="text-lg font-bold text-white">Descubierto cerca de ti</h2>
							{#if discovering}
								<span class="inline-flex items-center gap-1.5 text-xs text-gendo-accent bg-gendo-accent/15 border border-gendo-accent/30 px-2 py-0.5 rounded-full">
									<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
									</svg>
									Buscando con Apify…
								</span>
							{:else if discoveryCached && discoveryCachedAt}
								<span class="text-xs text-gendo-text-muted bg-gendo-muted px-2 py-0.5 rounded-full">
									📦 caché · {new Date(discoveryCachedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
								</span>
							{/if}
							<!-- Ciudad detectada -->
							{#if importStats}
								<span class="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
									🌍 {importStats.cityName}, {importStats.countryCode}
								</span>
							{/if}
							<!-- Stats de importación -->
							{#if importStats && !discoveryCached}
								<span class="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
									+{importStats.eventsUpserted} al mapa
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							{#if discoveredPlaces.length > 0}
								<span class="text-xs text-gray-500">{discoverFiltered.length} lugares</span>
							{/if}
							<!-- Botón para refrescar zona manualmente -->
							{#if userLat && userLng && !discovering}
								<button
									on:click={() => callDiscover(userLat ?? 0, userLng ?? 0)}
									class="text-xs text-gendo-text-muted hover:text-gendo-accent transition-colors flex items-center gap-1"
									title="Buscar de nuevo en esta zona"
								>
									🔄 Actualizar
								</button>
							{/if}
						</div>
					</div>

					<!-- Estado de carga -->
					{#if discovering}
						<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
							<div class="text-4xl mb-4 animate-bounce">🌍</div>
							<p class="text-white font-semibold mb-1">Explorando tu zona…</p>
							<p class="text-gray-400 text-sm max-w-xs">
								Gendo está buscando parques, eventos, restaurantes y más en Google Maps. Esto puede tardar hasta 2 minutos la primera vez.
							</p>
						</div>

					<!-- Error -->
					{:else if discoveryError}
						<div class="flex flex-col items-center justify-center py-8 px-6 text-center">
							<p class="text-red-400 text-sm">⚠️ {discoveryError}</p>
							{#if userLat && userLng}
								<button
									on:click={() => callDiscover(userLat ?? 0, userLng ?? 0)}
									class="mt-3 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors"
								>Reintentar</button>
							{/if}
						</div>

					<!-- APIFY_TOKEN no configurado -->
					{:else if discoveryNeedsToken}
						<div class="flex flex-col items-center justify-center py-8 px-6 text-center">
							<p class="text-gray-400 text-sm">
								Para descubrir lugares cerca de ti, configura <code class="bg-gendo-muted px-1 rounded">APIFY_TOKEN</code> en Vercel.
							</p>
							<p class="text-gray-500 text-xs mt-2">
								Token gratis en <a href="https://apify.com" target="_blank" rel="noopener" class="text-gendo-accent hover:underline">apify.com</a> → Settings → Environment Variables
							</p>
						</div>

					<!-- Resultados -->
					{:else if discoveredPlaces.length > 0}
						<!-- Filtros de categoría -->
						<div class="flex gap-2 px-5 py-3 overflow-x-auto">
							<button
								on:click={() => discoverFilter = 'all'}
								class="flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all
									{discoverFilter === 'all' ? 'bg-gendo-accent text-white' : 'bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80'}"
							>Todos</button>
							{#each ['agua','verde','zen','social'] as cat}
								{@const count = discoveredPlaces.filter(p => p.category === cat).length}
								{#if count > 0}
									<button
										on:click={() => discoverFilter = discoverFilter === cat ? 'all' : cat}
										class="flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all border
											{discoverFilter === cat
												? (cat==='agua' ? 'bg-blue-600 text-white border-blue-600' : cat==='verde' ? 'bg-green-600 text-white border-green-600' : cat==='zen' ? 'bg-purple-600 text-white border-purple-600' : 'bg-orange-500 text-white border-orange-500')
												: 'bg-gendo-muted text-gendo-cream/80 border-white/[0.06] hover:bg-gendo-muted/80'}"
									>
										{cat==='agua'?'🐟 Agua':cat==='verde'?'🚲 Verde':cat==='zen'?'🧘 Zen':'🎉 Social'}
										<span class="ml-1 opacity-70">{count}</span>
									</button>
								{/if}
							{/each}
						</div>

						<!-- Grid de lugares -->
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-5 pb-5">
							{#each discoverFiltered as place (place.id)}
								{@const col = place.category === 'agua' ? 'border-blue-500/30 hover:border-blue-400'
									: place.category === 'verde'  ? 'border-green-500/30 hover:border-green-400'
									: place.category === 'zen'    ? 'border-purple-500/30 hover:border-purple-400'
									: 'border-orange-500/30 hover:border-orange-400'}
								<div class="bg-gendo-muted/50 border {col} rounded-xl p-4 transition-all hover:bg-gendo-muted">
									<div class="flex items-start gap-3">
										<!-- Icono -->
										<div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl
											{place.category==='agua'  ? 'bg-blue-500/15 text-blue-300'
											: place.category==='verde' ? 'bg-green-500/15 text-green-300'
											: place.category==='zen'   ? 'bg-purple-500/15 text-purple-300'
											                           : 'bg-orange-500/15 text-orange-300'}">
											{place.style?.emoji ?? '📍'}
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-semibold text-white leading-tight truncate">{place.title}</p>
											{#if place.googleCat}
												<p class="text-xs text-gray-400 mt-0.5 truncate">{place.googleCat}</p>
											{/if}
											{#if place.address}
												<p class="text-xs text-gray-500 mt-0.5 truncate">📍 {place.address}</p>
											{/if}
											<div class="flex items-center gap-2 mt-1.5 flex-wrap">
												<!-- Badge de categoría -->
												<span class="text-xs px-1.5 py-0.5 rounded-full border font-medium
													{place.category==='agua'  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
													: place.category==='verde' ? 'bg-green-500/15 text-green-300 border-green-500/30'
													: place.category==='zen'   ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
													                           : 'bg-orange-500/15 text-orange-300 border-orange-500/30'}">
													{place.style?.label ?? place.category}
												</span>
												<!-- Rating -->
												{#if place.rating}
													<span class="text-xs text-yellow-400">⭐ {place.rating.toFixed(1)}</span>
												{/if}
												{#if place.reviews >= 30}
													<span class="text-xs text-gray-500">{place.reviews} reseñas</span>
												{/if}
											</div>
										</div>
									</div>
									<!-- Links externos -->
									{#if place.website || place.phone}
										<div class="flex gap-3 mt-3 pt-2.5 border-t border-gray-700/60">
											{#if place.website}
												<a href={place.website} target="_blank" rel="noopener noreferrer"
													class="text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors">
													🌐 Web
												</a>
											{/if}
											{#if place.phone}
												<a href="tel:{place.phone}"
													class="text-xs text-green-400 hover:text-green-300 transition-colors">
													📞 {place.phone}
												</a>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Mapa visual -->
					{#if discoveredPlaces.length > 0}
						<div class="px-5 pb-2 pt-1">
							<button
								on:click={() => showMap = !showMap}
								class="w-full flex items-center justify-between py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
							>
								<span class="flex items-center gap-2">
									🗺️ {showMap ? 'Ocultar mapa' : 'Ver en el mapa'}
									<span class="text-xs text-gray-600">{discoveredPlaces.filter(p=>p.lat&&p.lng).length} pines</span>
								</span>
								<span class="text-xs text-gray-600">{showMap ? '▲' : '▼'}</span>
							</button>
							{#if showMap}
								<div class="mt-2 mb-3">
									<GendoMap
										places={discoveredPlaces}
										userLat={userLat}
										userLng={userLng}
										height="380px"
										emitBounds={true}
										on:bounds={onMapBounds}
									/>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Nota de pie -->
					{#if !discovering}
						<div class="px-5 pb-4 text-xs text-gendo-text-muted border-t border-white/[0.06] pt-3 flex flex-wrap items-center justify-between gap-2">
							<span>Resultados de Google Maps via Apify · Rating ≥ 4.0 ó ≥ 30 reseñas · Caché 24 h por zona</span>
							{#if discoveryCachedAt}
								<span class="text-gray-700">
									📦 Disponible sin conexión hasta {new Date(discoveryCachedAt + 48*3600*1000).toLocaleDateString('es', { day:'numeric', month:'short' })}
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Panel Tus Intereses -->
		{#if userPrefs.length > 0}
			<section class="mb-10">
				<div class="bg-gendo-surface border border-white/[0.06] rounded-2xl p-5">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-2">
							<span class="text-xl">✨</span>
							<h2 class="text-lg font-bold text-white">Tus Intereses</h2>
							<span class="text-xs text-gendo-text-muted bg-gendo-muted px-2 py-0.5 rounded-full">{totalClicks} clics registrados</span>
						</div>
						<button
							on:click={clearPrefs}
							class="text-xs text-gray-500 hover:text-red-400 transition-colors"
							title="Borrar historial"
						>✕ Borrar</button>
					</div>

					<div class="space-y-2.5">
						{#each userPrefs as pref, i}
							{@const badge = getCategoryBadge(pref.category)}
							{@const barPct = pct(pref.click_count)}
							<div class="flex items-center gap-3">
								<!-- Posición -->
								<span class="text-xs text-gray-500 w-4 text-right flex-shrink-0">{i + 1}</span>
								<!-- Icono + label -->
								<span class="flex-shrink-0 w-28 flex items-center gap-1.5 text-sm">
									<span class="text-base">{typeEmoji[pref.category] ?? '📅'}</span>
									<span class="font-medium {badge.badge.split(' ').find(c => c.startsWith('text-')) ?? 'text-gray-300'} truncate">
										{typeLabel[pref.category] ?? pref.category}
									</span>
								</span>
								<!-- Barra de progreso -->
								<div class="flex-1 h-2 bg-gendo-muted rounded-full overflow-hidden">
									<div
										class="h-full rounded-full transition-all duration-500 {badge.dot}"
										style="width: {barPct}%"
									></div>
								</div>
								<!-- % y conteo -->
								<div class="flex-shrink-0 flex items-center gap-2 text-xs text-right">
									<span class="text-gray-400 w-8">{barPct}%</span>
									<span class="text-gray-600 w-14">{pref.click_count} {pref.click_count === 1 ? 'clic' : 'clics'}</span>
								</div>
							</div>
						{/each}
					</div>

					<p class="text-xs text-gray-600 mt-4">
						Basado en los eventos que has visitado · Se actualiza en tiempo real
					</p>
				</div>
			</section>
		{/if}

		<!-- Featured Events (por viewport del mapa o todos si no hay mapa) -->
		{#if data.featured.length > 0 || featuredNearby.length > 0}
			<section class="mb-12">
				<div class="flex items-center justify-between mb-5 flex-wrap gap-3">
					<h2 class="text-2xl font-bold text-white">⭐ Featured Events</h2>
					{#if mapBounds}
						<span class="text-xs text-gray-500">Zona visible en el mapa</span>
					{/if}
				</div>
				{#if featuredNearby.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				{#each featuredNearby as ev (ev.id)}
					<a href="/event/{ev.id}" on:click={() => trackClick(ev.type)} class="group relative bg-gendo-surface border border-white/[0.06] hover:border-gendo-accent/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-gendo-accent/10">
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
							<!-- Icono de categoría con fondo coloreado -->
							<div class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl {getCategoryBadge(ev.type).badge}">
								{typeEmoji[ev.type] ?? '📅'}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-1.5 mb-1 flex-wrap">
									<span class="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">⭐ Featured</span>
									<!-- Badge de categoría: punto + tipo para ahorrar espacio -->
									<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium {getCategoryBadge(ev.type).badge}">
										<span class="w-1.5 h-1.5 rounded-full flex-shrink-0 {getCategoryBadge(ev.type).dot}"></span>
										{typeLabel[ev.type] ?? ev.type}
									</span>
									{#if ev.price === 'free'}
										<span class="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">FREE</span>
									{/if}
								</div>
								<h3 class="font-semibold text-white group-hover:text-gendo-accent transition-colors line-clamp-2">{t(cleanEventTitle(ev.title, ev.cityName))}</h3>
								<p class="text-gendo-accent/90 text-xs mt-1">{formatEventDate(ev.dateStart)}</p>
								{#if ev.venueName}
									<button
										on:click={(e) => openDirections(e, ev)}
										class="text-gray-400 text-xs mt-0.5 truncate text-left w-full hover:text-gendo-accent transition-colors cursor-pointer"
										title="Abrir en mapa"
									>📍 {cleanVenueName(ev.venueName, ev.cityName)}</button>
								{/if}
								{#if ev.cityName}
									<p class="text-gray-500 text-xs mt-0.5">🌍 {formatEventCity(ev)}</p>
								{/if}
								<button
									on:click={(e) => openDirections(e, ev)}
									class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors"
									title="Cómo llegar"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
									Cómo llegar
								</button>
							</div>
						</div>
					</a>
				{/each}
				</div>
				{:else if mapBounds}
					<p class="text-gray-400 text-sm py-6 text-center">
						No hay eventos destacados en esta zona. Arrastra el mapa para explorar.
					</p>
				{:else if data.featured.length > 0}
					<p class="text-gray-400 text-sm py-6 text-center">
						Abre el mapa para ver eventos por zona.
					</p>
				{/if}
			</section>
		{/if}

		<!-- Cities -->
		<section class="mb-14">
			<div class="flex items-center justify-between mb-4 flex-wrap gap-2">
				<div class="flex items-center gap-2">
					<h2 class="text-base font-semibold text-white">{topCitiesLabel}</h2>
					{#if userCountryCode}
						<span class="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">GPS</span>
					{/if}
				</div>
				<button
					on:click={() => document.querySelector('[data-world-search]')?.dispatchEvent(new MouseEvent('click'))}
					class="text-xs text-gendo-text-muted hover:text-gendo-accent transition-colors"
				>
					Search elsewhere →
				</button>
			</div>

			{#if topCities.length > 0}
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
				{#each topCities as city (`${city.name}|${city.countryCode ?? ''}|${city.state ?? ''}`)}
					{@const flagOffset = 0x1F1E6 - 0x41}
					{@const cityFlag = city.countryCode
						? [...(city.countryCode).toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + flagOffset)).join('')
						: '🌍'}
					{@const isLocal = city.countryCode === userCountryCode}
					<button
						on:click={() => goToCity(city.name)}
						class="bg-gendo-surface border rounded-xl p-3 sm:p-4 text-center transition-all hover:bg-white/[0.06] group min-h-[100px] sm:min-h-0
							{isLocal
								? 'border-gendo-accent/40 hover:border-gendo-accent/60 ring-1 ring-gendo-accent/20'
								: 'border-white/[0.06] hover:border-gendo-accent/50'}"
					>
						<p class="text-2xl mb-1">{cityFlag}</p>
						<p class="font-semibold text-sm group-hover:text-gendo-accent transition-colors truncate
							{isLocal ? 'text-gendo-accent/90' : 'text-white'}">{formatCityDisplay(city)}</p>
						<p class="text-zinc-500 text-xs mt-0.5 truncate">{city.country}</p>
						<p class="text-gendo-accent/80 text-xs mt-1.5 font-medium">{city.event_count} eventos</p>
					</button>
				{/each}
			</div>
			{:else if userState}
				<p class="text-gray-400 text-sm py-6 text-center">
					No hay ciudades con eventos en {US_STATE_NAMES[userState] ?? userState} por ahora.
				</p>
			{/if}
		</section>

		<!-- All Events — with filters -->
		<section>
			<div class="flex items-center justify-between mb-4 flex-wrap gap-2">
				<h2 class="text-xl sm:text-2xl font-bold text-white">
					🗓️ {timeFilter === 'today' ? 'Hoy' : timeFilter === 'tomorrow' ? 'Mañana' : timeFilter === 'weekend' ? 'Fin de Semana' : 'All Upcoming Events'}
				</h2>
				<span class="text-gray-400 text-sm">
					{#if boundsEventsLoading}
						<svg class="w-3.5 h-3.5 inline animate-spin mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
					{/if}
					{filteredEvents.length} events
					{#if mapBounds}
						<span class="text-xs text-gendo-accent/80">· zona del mapa</span>
					{/if}
				</span>
			</div>

			<!-- Banner de contexto de ranking -->
			<div class="flex items-center gap-2 mb-5 p-3 rounded-xl bg-gendo-surface border border-white/[0.06] text-sm flex-wrap">
				<!-- Franja horaria -->
				<span class="text-base">{data.rankingContext.timeSlotLabel.split(' ')[0]}</span>
				<span class="text-gray-300 font-medium">{data.rankingContext.timeSlotLabel.split(' ').slice(1).join(' ')}</span>

				{#if hasPreferences}
					<span class="text-gray-700">·</span>

					<!-- Persona detectada -->
					{#if persona && persona !== 'neutral'}
						<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gendo-accent/15 text-gendo-accent border border-gendo-accent/30 font-medium">
							{PERSONA_LABELS[persona] ?? persona}
						</span>
					{/if}

					<!-- Top categorías -->
					{#each data.rankingContext.topUserCategories as cat}
						<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border {getCategoryBadge(cat).badge}">
							{typeEmoji[cat] ?? '📅'} {typeLabel[cat] ?? cat}
						</span>
					{/each}

					<!-- Indicador GPS ciudad detectada -->
					{#if detectingCity}
						<span class="inline-flex items-center gap-1 text-xs text-gray-500">
							<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
							Detectando ubicación...
						</span>
					{:else if detectedCity}
						<span class="text-gray-700">·</span>
						<button
							on:click={() => { selectedCity = ''; detectedCity = null; }}
							title="Ver todos los eventos"
							class="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-transparent border-0 p-0 cursor-pointer"
						>
							📍 {detectedCity}
							<span class="text-gray-600 hover:text-gray-400 ml-0.5">✕</span>
						</button>
					{/if}
				{:else}
					<span class="text-gray-600 text-xs ml-1">Usa el onboarding para personalizar el orden</span>
				{/if}
			</div>

			<!-- Filters — scroll on mobile -->
			<div class="flex flex-col gap-3 mb-6">
				<!-- Burbujas de tiempo: Hoy / Mañana / Fin de Semana -->
				<div class="flex flex-wrap gap-1.5 sm:gap-2">
					{#each ['today', 'tomorrow', 'weekend', 'all'] as tf}
						{@const label = tf === 'today' ? 'Hoy' : tf === 'tomorrow' ? 'Mañana' : tf === 'weekend' ? 'Fin de Semana' : 'Todos'}
						{@const isActive = timeFilter === tf}
						<button
							on:click={() => timeFilter = tf}
							class="px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 min-h-[36px] sm:min-h-0
								{isActive
									? 'bg-gendo-accent text-white shadow-md'
									: 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-zinc-300'}"
						>
							{label}
						</button>
					{/each}
				</div>
				<div class="flex flex-wrap gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 sm:mx-0 sm:overflow-visible">
				<!-- Búsqueda inteligente de ubicación + botón Cerca de mí -->
				<div class="relative flex items-center gap-2">
					{#if nearMeMode}
						<div class="flex items-center gap-2 bg-gendo-muted border border-gendo-accent/50 rounded-xl px-4 py-2 text-sm">
							<!-- Icono mira/brújula -->
							<svg class="w-4 h-4 text-gendo-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<circle cx="12" cy="12" r="10"/>
								<circle cx="12" cy="12" r="6"/>
								<circle cx="12" cy="12" r="2"/>
								<line x1="12" y1="2" x2="12" y2="6"/>
								<line x1="12" y1="18" x2="12" y2="22"/>
								<line x1="2" y1="12" x2="6" y2="12"/>
								<line x1="18" y1="12" x2="22" y2="12"/>
							</svg>
							<span class="text-white">Cerca de mí ({NEAR_ME_RADIUS_KM} km)</span>
							<button
								on:click={() => { nearMeMode = false; nearMeError = ''; }}
								class="text-gray-500 hover:text-white ml-1 transition-colors"
								title="Quitar filtro"
							>✕</button>
						</div>
					{:else if locationFilter}
						<div class="flex items-center gap-2 bg-gendo-muted border border-gendo-accent/50 rounded-xl px-4 py-2 text-sm">
							<span class="text-gendo-accent">📍</span>
							<span class="text-white">{locationFilter.name}{locationFilter.type === 'country' && locationFilter.country !== locationFilter.name ? ` (${locationFilter.country})` : ''}</span>
							<button
								on:click={clearLocationFilter}
								class="text-gray-500 hover:text-white ml-1 transition-colors"
								title="Quitar filtro"
							>✕</button>
						</div>
					{:else}
						<div class="relative flex items-center gap-2 bg-gendo-muted border border-white/[0.06] hover:border-gendo-accent focus-within:border-gendo-accent rounded-xl px-4 py-2.5 sm:py-2 text-sm transition-colors min-w-0">
							<span class="text-gray-500 flex-shrink-0">🔍</span>
							<input
								bind:value={locationSearch}
								on:input={onLocationSearchInput}
								on:focus={() => { if (locationSuggestions.length > 0) showLocationSuggestions = true; }}
								on:blur={() => setTimeout(() => showLocationSuggestions = false, 180)}
								type="text"
								placeholder="Ciudad, pueblo o país…"
								class="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none min-w-0 w-24 sm:w-auto"
							/>
							{#if locationSearch}
								<button on:click={() => { locationSearch = ''; locationSuggestions = []; showLocationSuggestions = false; }} class="text-gray-500 hover:text-gray-400">✕</button>
							{/if}
							<!-- Botón Cerca de mí: mira/brújula -->
							<button
								on:click={toggleNearMe}
								disabled={nearMeLoading}
								class="flex-shrink-0 p-1.5 rounded-lg text-gendo-accent hover:bg-gendo-accent/15 hover:text-white transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
								title="Cerca de mí: eventos a {NEAR_ME_RADIUS_KM} km"
							>
								{#if nearMeLoading}
									<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
								{:else}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
										<circle cx="12" cy="12" r="10"/>
										<circle cx="12" cy="12" r="6"/>
										<circle cx="12" cy="12" r="2"/>
										<line x1="12" y1="2" x2="12" y2="6"/>
										<line x1="12" y1="18" x2="12" y2="22"/>
										<line x1="2" y1="12" x2="6" y2="12"/>
										<line x1="18" y1="12" x2="22" y2="12"/>
									</svg>
								{/if}
							</button>
						</div>
						{#if nearMeError}
							<p class="absolute top-full left-0 mt-1 text-xs text-red-400 bg-red-900/30 px-3 py-2 rounded-lg z-50 max-w-[280px]">{nearMeError}</p>
						{/if}
						{#if showLocationSuggestions && locationSuggestions.length > 0}
							<div class="absolute top-full left-0 mt-1 bg-gendo-surface border border-white/[0.06] rounded-xl shadow-2xl z-50 overflow-hidden min-w-[220px] max-h-64 overflow-y-auto">
								{#each locationSuggestions as s}
									<button
										on:click={() => selectLocation(s)}
										on:mousedown|preventDefault
										class="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gendo-muted text-left text-sm transition-colors border-b border-white/[0.06] last:border-0"
									>
										<span class="text-lg">{[...(s.countryCode || 'XX').toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')}</span>
										<span class="text-white truncate">{s.name}</span>
										{#if s.country && s.country !== s.name}
											<span class="text-gray-500 text-xs truncate">· {s.country}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						on:click={() => selectedType = 'all'}
						class="px-3 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 min-h-[44px] sm:min-h-0 {selectedType === 'all' ? 'bg-gendo-accent text-white shadow-md' : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]'}"
					>All</button>
					{#each allTypes as t}
						<button
							on:click={() => selectedType = selectedType === t ? 'all' : t}
							class="px-3 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 flex-shrink-0 min-h-[44px] sm:min-h-0
								{selectedType === t
									? getCategoryBadge(t).active + ' shadow-md'
									: 'bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80'}"
						>
							{#if selectedType !== t}
								<span class="w-2 h-2 rounded-full {getCategoryBadge(t).dot}"></span>
							{/if}
							{typeEmoji[t] ?? '📅'} {typeLabel[t] ?? t}
						</button>
					{/each}
				</div>
				</div>
			</div>

			<!-- Events grid -->
			{#if filteredEvents.length === 0}
				<div class="text-center py-16 text-gray-500">
					<p class="text-3xl mb-3">🔍</p>
					<p>No events found for that filter.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
					{#each filteredEvents as ev (ev.id)}
						{@const rankBadge = getRankBadge(ev)}
						{@const isStar = ev.isStarOfDay === true}
						<a
							href="/event/{ev.id}"
							on:click={() => trackClick(ev.type)}
							class="group rounded-xl p-4 transition-all hover:shadow-md border relative overflow-hidden
								{isStar
									? 'bg-gradient-to-br from-amber-950/60 to-gendo-bg border-amber-500/50 hover:border-amber-400 shadow-amber-900/30 shadow-md ring-1 ring-amber-500/20'
									: rankBadge
										? 'bg-gendo-surface border-gendo-accent/30 hover:border-gendo-accent/50 shadow-gendo-accent/5 shadow-sm'
										: 'bg-gendo-surface border-white/[0.06] hover:border-gendo-accent/40'}"
						>
							<!-- Corazón favoritos -->
							<button
								on:click={(e) => toggleSave(ev.id, e)}
								disabled={savingEventId === ev.id}
								class="absolute top-2 right-2 p-1.5 rounded-full transition-colors z-10
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
							<!-- Destello superior dorado solo en Estrella del Día -->
							{#if isStar}
								<div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
								<div class="absolute top-2 right-10 text-amber-400 text-base leading-none select-none" title="Recomendación Estrella del Día">⭐</div>
							{/if}

							<div class="flex items-start gap-3">
								<!-- Icono con fondo de color de la categoría -->
								<div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl {getCategoryBadge(ev.type).badge}">
									{typeEmoji[ev.type] ?? '📅'}
								</div>
								<div class="flex-1 min-w-0 {isStar ? 'pr-5' : ''}">
									<h3 class="font-medium {isStar ? 'text-amber-100' : 'text-white'} group-hover:text-gendo-accent transition-colors line-clamp-2 text-sm">{t(cleanEventTitle(ev.title, ev.cityName))}</h3>

									<!-- Fila de badges: ranking primero, luego categoría (compacto si hay muchas) -->
									<div class="flex flex-wrap gap-1.5 mt-1">
										{#if rankBadge}
											<span class="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium {rankBadge.cls}">
												{rankBadge.label}
											</span>
										{/if}
										{#if rankBadge?.sublabel}
											<span class="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium bg-amber-500/10 text-amber-300 border-amber-500/30">
												{rankBadge.sublabel}
											</span>
										{/if}
										<!-- Si hay rankBadge+sublabel: solo punto de color; si no: emoji pequeño + label -->
										{#if rankBadge && rankBadge.sublabel}
											<span class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium {getCategoryBadge(ev.type).badge}" title={typeLabel[ev.type] ?? ev.type}>
												<span class="w-1.5 h-1.5 rounded-full flex-shrink-0 {getCategoryBadge(ev.type).dot}"></span>
												{typeLabel[ev.type] ?? ev.type}
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium {getCategoryBadge(ev.type).badge}">
												<span class="text-[10px] leading-none">{typeEmoji[ev.type] ?? '📅'}</span>
												{typeLabel[ev.type] ?? ev.type}
											</span>
										{/if}
									</div>
									<p class="{isStar ? 'text-amber-300' : 'text-gendo-accent/80'} text-xs mt-1">{formatEventDate(ev.dateStart)}</p>
									<div class="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-400">
										{#if ev.venueName}
											<button
												on:click={(e) => openDirections(e, ev)}
												class="hover:text-gendo-accent transition-colors cursor-pointer"
												title="Abrir en mapa"
											>📍 {cleanVenueName(ev.venueName, ev.cityName).slice(0, 25)}</button>
										{/if}
										{#if ev.cityName}<span>· {formatEventCity(ev)}</span>{/if}
										{#if ev.price === 'free'}<span class="text-green-400 font-medium">FREE</span>
										{:else if ev.priceAmount}<span class="text-yellow-400">${ev.priceAmount}</span>
										{/if}
									</div>
									<button
										on:click={(e) => openDirections(e, ev)}
										class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors"
										title="Cómo llegar"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
										Cómo llegar
									</button>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Footer — minimal, responsive -->
	<footer class="border-t border-white/[0.06] mt-16 sm:mt-20 py-8 sm:py-10 px-4 sm:px-6">
		<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
			<p>Gendo</p>
			<nav class="flex flex-wrap justify-center gap-4 sm:gap-6">
				<a href="/agenda" class="hover:text-white transition-colors">Agenda</a>
				<a href="/meetups" class="hover:text-white transition-colors">Meetups</a>
				<a href="/submit" class="hover:text-white transition-colors">Submit</a>
				<a href="/admin" class="hover:text-white transition-colors py-2 sm:py-0">Admin</a>
			</nav>
		</div>
	</footer>
</div>
