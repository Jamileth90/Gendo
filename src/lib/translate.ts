/**
 * Traducción en tiempo real según idioma del dispositivo.
 * Usa la API de Gendo que traduce con IA.
 */

const CACHE_KEY = 'gendo_translations';
const CACHE_MAX = 500;

type Lang = 'es' | 'en';

let cache: Map<string, string> = new Map();
let pendingBatch: { texts: string[]; resolve: (t: string[]) => void }[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

function loadCache() {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (raw) {
			const arr = JSON.parse(raw) as [string, string][];
			cache = new Map(arr.slice(-CACHE_MAX));
		}
	} catch {}
}

function saveCache() {
	try {
		const arr = Array.from(cache.entries()).slice(-CACHE_MAX);
		localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
	} catch {}
}

export function getUserLang(): Lang {
	if (typeof navigator === 'undefined') return 'en';
	const lang = navigator.language?.toLowerCase() ?? '';
	if (lang.startsWith('es')) return 'es';
	return 'en';
}


/**
 * Traduce textos en lote. Usa caché local para evitar llamadas repetidas.
 */
export async function translateBatch(texts: string[], targetLang: Lang): Promise<string[]> {
	if (texts.length === 0) return [];

	if (typeof cache === 'undefined' || cache.size === 0) loadCache();

	const results: string[] = new Array(texts.length);
	const toFetch: { i: number; text: string }[] = [];

	for (let i = 0; i < texts.length; i++) {
		const t = String(texts[i] ?? '').trim();
		if (!t) {
			results[i] = '';
			continue;
		}
		const key = `${targetLang}:${t}`;
		const cached = cache.get(key);
		if (cached !== undefined) {
			results[i] = cached;
		} else {
			toFetch.push({ i, text: t });
		}
	}

	if (toFetch.length === 0) return results;

	try {
		const fetchTexts = toFetch.map((x) => x.text);
		const res = await fetch('/api/translate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ texts: fetchTexts, targetLang }),
		});
		const data = await res.json();
		if (!res.ok) return results;
		const translations = data.translations ?? fetchTexts;

		for (let j = 0; j < toFetch.length; j++) {
			const { i } = toFetch[j];
			const orig = fetchTexts[j];
			const trans = translations[j] ?? orig;
			results[i] = trans;
			cache.set(`${targetLang}:${orig}`, trans);
		}
		saveCache();
	} catch {
		for (const { i, text } of toFetch) results[i] = text;
	}

	return results;
}

/**
 * Traduce un solo texto. Útil para componentes que cargan uno a uno.
 */
export async function translateText(text: string | null | undefined, targetLang: Lang): Promise<string> {
	if (!text || !text.trim()) return '';
	const [translated] = await translateBatch([text], targetLang);
	return translated || text;
}
