/**
 * GET /api/geocode-city?q=Salinas
 *
 * Geocodifica cualquier lugar del mundo usando Nominatim (OpenStreetMap, gratis).
 * Cubre: ciudades, pueblos, aldeas, barrios, provincias, estados y municipios.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

// Etiquetas legibles para cada tipo de lugar (ES + EN → ES)
const PLACE_LABEL: Record<string, string> = {
	// Núcleos urbanos
	city:              'Ciudad',
	town:              'Pueblo',
	village:           'Aldea',
	hamlet:            'Caserío',
	suburb:            'Barrio',
	quarter:           'Barrio',
	neighbourhood:     'Colonia',
	isolated_dwelling: 'Localidad',
	// Divisiones administrativas
	municipality:      'Municipio',
	county:            'Condado / Departamento',
	district:          'Distrito',
	province:          'Provincia',
	state:             'Estado / Provincia',
	region:            'Región',
	state_district:    'Distrito',
	administrative:    'Área administrativa',
	// Otros
	island:            'Isla',
	archipelago:       'Archipiélago',
	locality:          'Localidad',
	postcode:          'Código postal',
	country:           'País',
	boundary:          'País / Región',
};

// Emojis por tipo de lugar
const PLACE_EMOJI: Record<string, string> = {
	city: '🏙️', town: '🏘️', village: '🏡', hamlet: '🌾',
	suburb: '🏙️', quarter: '🏙️', neighbourhood: '🏘️',
	municipality: '🏛️', county: '📍', district: '📍',
	province: '🗺️', state: '🗺️', region: '🗺️',
	administrative: '📍', island: '🏝️', locality: '📍',
	country: '🌍', boundary: '🌍',
};

// Prioridad de tipo (menor número = aparece primero)
const TYPE_PRIORITY: Record<string, number> = {
	city: 1, town: 2, village: 3, municipality: 3,
	suburb: 4, quarter: 4, neighbourhood: 4, hamlet: 5,
	district: 6, county: 7, province: 7, state: 8,
	region: 9, administrative: 10, island: 3,
	country: 8, boundary: 8,
};

interface NominatimItem {
	lat:          string;
	lon:          string;
	display_name: string;
	type:         string;
	class:        string;
	importance:   number;
	address?: {
		city?:           string;
		town?:           string;
		village?:        string;
		hamlet?:         string;
		suburb?:         string;
		quarter?:        string;
		neighbourhood?:  string;
		municipality?:   string;
		county?:         string;
		state_district?: string;
		state?:          string;
		province?:       string;
		region?:         string;
		country?:        string;
		country_code?:   string;
		postcode?:       string;
	};
}

function extractName(item: NominatimItem, fallback: string): string {
	const a = item.address ?? {};
	// Para países, usar el nombre del país
	if (item.type === 'country' || item.type === 'boundary') {
		return a.country ?? item.display_name.split(',')[0].trim() ?? fallback;
	}
	return (
		a.city ?? a.town ?? a.village ?? a.hamlet ??
		a.suburb ?? a.quarter ?? a.neighbourhood ??
		a.municipality ?? a.county ?? a.state_district ??
		a.state ?? a.province ?? a.region ??
		a.country ?? item.display_name.split(',')[0].trim() ??
		fallback
	);
}

function extractState(item: NominatimItem): string | null {
	const a = item.address ?? {};
	return a.state ?? a.province ?? a.region ?? a.state_district ?? null;
}

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return json({ error: 'Parámetro q requerido' }, { status: 400 });

	try {
		// Pedimos 10 resultados para tener margen de filtrado
		const res = await fetch(
			`${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1&extratags=0`,
			{ headers: { 'User-Agent': 'Gendo-App/1.0 (contact@gendo.app)' } }
		);
		if (!res.ok) throw new Error(`Nominatim ${res.status}`);

		const items = await res.json() as NominatimItem[];

		// Convertir todos los resultados, con metadata de tipo
		const all = items.map(i => ({
			lat:         parseFloat(i.lat),
			lng:         parseFloat(i.lon),
			displayName: i.display_name,
			name:        extractName(i, q),
			state:       extractState(i),
			country:     i.address?.country     ?? '',
			countryCode: (i.address?.country_code ?? 'XX').toUpperCase(),
			placeType:   i.type,
			placeClass:  i.class,
			placeLabel:  PLACE_LABEL[i.type] ?? PLACE_LABEL[i.class] ?? 'Lugar',
			placeEmoji:  PLACE_EMOJI[i.type]  ?? PLACE_EMOJI[i.class] ?? '📍',
			priority:    TYPE_PRIORITY[i.type] ?? 11,
			importance:  i.importance ?? 0,
		}));

		// Ordenar: primero por prioridad de tipo, luego por importancia (Nominatim)
		all.sort((a, b) => a.priority - b.priority || b.importance - a.importance);

		// Deduplicar por nombre + countryCode para no mostrar duplicados
		const seen   = new Set<string>();
		const unique = all.filter(r => {
			const k = `${r.name}|${r.countryCode}|${r.placeType}`;
			if (seen.has(k)) return false;
			seen.add(k);
			return true;
		});

		return json({ results: unique.slice(0, 7) });

	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[geocode-city]', msg);
		return json({ error: msg, results: [] }, { status: 500 });
	}
};
