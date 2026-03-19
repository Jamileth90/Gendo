/**
 * Caché offline para eventos: guarda en localStorage para ver direcciones y horarios sin conexión.
 * Válido 7 días. Se actualiza cada vez que el usuario carga la página con conexión.
 */

const CACHE_KEY = 'gendo_events_cache';
const CACHE_META_KEY = 'gendo_events_cache_meta';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface OfflineEvent {
	id: number;
	title: string;
	description: string | null;
	dateStart: number;
	dateEnd?: number | null;
	type: string;
	price: string | null;
	priceAmount: number | null;
	currency: string | null;
	venueName: string | null;
	venueAddress: string | null;
	venueLat?: number | null;
	venueLng?: number | null;
	cityName: string | null;
	cityState: string | null;
	cityCountry: string | null;
	sourceUrl?: string | null;
	score?: number;
	rankReasons?: string[];
	featured?: boolean;
}

export interface OfflineCache {
	upcoming: OfflineEvent[];
	featured: OfflineEvent[];
	cities: Array<{ id: number; name: string; countryCode: string; state: string | null; event_count: number }>;
	rankingContext: Record<string, unknown>;
	savedAt: number;
}

export interface CityOfflineCache {
	events: OfflineEvent[];
	city: { name: string; state: string | null; country: string };
	venues: Array<{ id: number; name: string; address?: string | null; website?: string | null }>;
	typeCounts: Array<{ type: string; count: number }>;
	savedAt: number;
}

function isExpired(savedAt: number): boolean {
	return Date.now() - savedAt > TTL_MS;
}

export function saveHomeCache(cache: Omit<OfflineCache, 'savedAt'>): void {
	if (typeof window === 'undefined') return;
	try {
		const data: OfflineCache = { ...cache, savedAt: Date.now() };
		localStorage.setItem(CACHE_KEY, JSON.stringify(data));
		localStorage.setItem(CACHE_META_KEY, JSON.stringify({ savedAt: data.savedAt }));
	} catch {}
}

export function loadHomeCache(): OfflineCache | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw) as OfflineCache;
		if (isExpired(data.savedAt)) return null;
		return data;
	} catch {
		return null;
	}
}

const CITY_CACHE_PREFIX = 'gendo_city_cache_';

export function saveCityCache(slug: string, cache: Omit<CityOfflineCache, 'savedAt'>): void {
	if (typeof window === 'undefined') return;
	try {
		const data: CityOfflineCache = { ...cache, savedAt: Date.now() };
		localStorage.setItem(CITY_CACHE_PREFIX + slug, JSON.stringify(data));
	} catch {}
}

export function loadCityCache(slug: string): CityOfflineCache | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CITY_CACHE_PREFIX + slug);
		if (!raw) return null;
		const data = JSON.parse(raw) as CityOfflineCache;
		if (isExpired(data.savedAt)) return null;
		return data;
	} catch {
		return null;
	}
}

export function isOnline(): boolean {
	return typeof navigator !== 'undefined' && navigator.onLine;
}
