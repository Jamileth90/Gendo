/**
 * Formato de ciudad: "Ciudad, Estado/Provincia"
 * Ej: Cedar Rapids, IA — Guayaquil, Guayas
 */

// US: nombre completo → abreviatura de 2 letras
const US_STATE_TO_ABBREV: Record<string, string> = {
	Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
	Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
	Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
	Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
	Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
	Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
	'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
	'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
	'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
	Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
	'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
	'Puerto Rico': 'PR',
};

export function formatCityDisplay(city: {
	name: string;
	state?: string | null;
	countryCode?: string | null;
}): string {
	const name = (city.name ?? '').trim();
	if (!name) return '';

	const state = (city.state ?? '').trim();
	if (!state) return name;

	const cc = (city.countryCode ?? '').toUpperCase();

	// US: usar abreviatura de 2 letras (IA, NY, etc.)
	if (cc === 'US') {
		const abbrev = US_STATE_TO_ABBREV[state] ?? (state.length === 2 ? state : state);
		return `${name}, ${abbrev}`;
	}

	// Otros países: ciudad, estado/provincia (Guayas, Pichincha, etc.)
	return `${name}, ${state}`;
}

/**
 * Para eventos que tienen cityName y cityState por separado
 */
export function formatEventCity(ev: {
	cityName?: string | null;
	cityState?: string | null;
	cityCountry?: string | null;
}): string {
	const name = (ev.cityName ?? '').trim();
	if (!name) return '';

	const state = (ev.cityState ?? '').trim();
	if (!state) return name;

	// US: si state ya es abreviatura (2 letras) o si está en el mapa
	const isUS = /^(United States|USA|US)$/i.test((ev.cityCountry ?? '').trim());
	const isUSAbbrev = state.length === 2 && /^[A-Z]{2}$/i.test(state);

	if (isUSAbbrev) return `${name}, ${state.toUpperCase()}`;
	if (isUS && US_STATE_TO_ABBREV[state]) return `${name}, ${US_STATE_TO_ABBREV[state]}`;

	return `${name}, ${state}`;
}
