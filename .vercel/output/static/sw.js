/**
 * Service Worker: guarda páginas en caché para ver eventos sin conexión.
 * Cuando visitas una ciudad con internet, se guarda. Sin señal, se muestra lo guardado.
 */
const CACHE = 'gendo-offline-v1';

self.addEventListener('install', (e) => {
	self.skipWaiting();
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (e) => {
	if (e.request.method !== 'GET') return;
	const url = new URL(e.request.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api/') && !url.pathname.includes('/api/events/') && !url.pathname.includes('/api/saved-events')) return;

	e.respondWith(
		fetch(e.request)
			.then((res) => {
				if (!res.ok || res.type === 'error') return res;
				const clone = res.clone();
				if (url.pathname === '/' || url.pathname.startsWith('/city/') || url.pathname.startsWith('/event/') || url.search.includes('__data')) {
					caches.open(CACHE).then((c) => c.put(e.request, clone));
				}
				return res;
			})
			.catch(() => caches.match(e.request).then((cached) => cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })))
	);
});
