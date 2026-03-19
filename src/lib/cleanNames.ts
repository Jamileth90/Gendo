/**
 * Limpia nombres de venues/eventos que traen ciudad o estado pegado.
 * Ej: "HOTWORX - Cedar Rapids, IA" → "HOTWORX"
 * La ciudad se muestra aparte en la UI, así que la quitamos del nombre.
 */
export function cleanVenueName(
	name: string | null | undefined,
	cityName?: string | null
): string {
	if (!name || typeof name !== 'string') return '';
	let s = name.trim();
	if (!s) return '';

	// Quitar ", XX" al final (código de estado US: IA, NY, CA, etc.)
	s = s.replace(/,?\s*[A-Z]{2}\s*$/, '').trim();

	// Si tenemos el nombre de la ciudad, quitar sufijos que la incluyan
	if (cityName && cityName.trim()) {
		const city = cityName.trim();
		const cityEscaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// " - City, ST" o " - City" o " | City, ST" o " (City, ST)"
		const suffixRegex = new RegExp(
			`\\s*[-–|]\\s*${cityEscaped}(?:,\\s*[A-Z]{2})?\\s*$|\\s*\\(\\s*${cityEscaped}(?:,\\s*[A-Z]{2})?\\s*\\)\\s*$`,
			'i'
		);
		s = s.replace(suffixRegex, '').trim();
	}

	// Patrón genérico: " - Algo, XX" o " | Algo, XX" al final (cuando Algo parece ciudad: palabras, coma, estado)
	s = s.replace(/\s*[-–|]\s*[^–-]+,\s*[A-Z]{2}\s*$/i, '').trim();

	// " - Algo" al final cuando Algo es corto (posible ciudad) - solo si queda redundante
	// Ej: "HOTWORX - Cedar Rapids" → "HOTWORX"
	if (cityName && cityName.trim()) {
		const city = cityName.trim();
		const cityLower = city.toLowerCase();
		const suffixMatch = s.match(/\s*[-–|]\s*(.+)$/);
		if (suffixMatch) {
			const afterDash = suffixMatch[1].trim().toLowerCase();
			// Si lo que sigue al guión es la ciudad (o empieza con la ciudad), quitarlo
			if (afterDash === cityLower || afterDash.startsWith(cityLower + ',') || afterDash.startsWith(cityLower + ' ')) {
				s = s.replace(/\s*[-–|]\s*.+$/, '').trim();
			}
		}
	}

	return s || name.trim();
}

/**
 * Limpia títulos de eventos que traen ciudad/estado pegado.
 * Misma lógica que cleanVenueName.
 */
export function cleanEventTitle(
	title: string | null | undefined,
	cityName?: string | null
): string {
	return cleanVenueName(title, cityName);
}
