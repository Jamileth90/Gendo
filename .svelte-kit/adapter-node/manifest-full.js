export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["sw.js"]),
	mimeTypes: {".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.B0uF33z3.js",app:"_app/immutable/entry/app.CUdtBfK8.js",imports:["_app/immutable/entry/start.B0uF33z3.js","_app/immutable/chunks/DwFuaow-.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/entry/app.CUdtBfK8.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/agenda",
				pattern: /^\/agenda\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/api/admin/submit",
				pattern: /^\/api\/admin\/submit\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/submit/_server.ts.js'))
			},
			{
				id: "/api/auth",
				pattern: /^\/api\/auth\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/_server.ts.js'))
			},
			{
				id: "/api/city",
				pattern: /^\/api\/city\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/city/_server.ts.js'))
			},
			{
				id: "/api/comments",
				pattern: /^\/api\/comments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/comments/_server.ts.js'))
			},
			{
				id: "/api/discover",
				pattern: /^\/api\/discover\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/discover/_server.ts.js'))
			},
			{
				id: "/api/events",
				pattern: /^\/api\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/events/_server.ts.js'))
			},
			{
				id: "/api/events/by-bounds",
				pattern: /^\/api\/events\/by-bounds\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/events/by-bounds/_server.ts.js'))
			},
			{
				id: "/api/events/by-ids",
				pattern: /^\/api\/events\/by-ids\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/events/by-ids/_server.ts.js'))
			},
			{
				id: "/api/geocode-city",
				pattern: /^\/api\/geocode-city\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/geocode-city/_server.ts.js'))
			},
			{
				id: "/api/geo",
				pattern: /^\/api\/geo\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/geo/_server.ts.js'))
			},
			{
				id: "/api/greeting",
				pattern: /^\/api\/greeting\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/greeting/_server.ts.js'))
			},
			{
				id: "/api/meetups",
				pattern: /^\/api\/meetups\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/meetups/_server.ts.js'))
			},
			{
				id: "/api/preferences",
				pattern: /^\/api\/preferences\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/preferences/_server.ts.js'))
			},
			{
				id: "/api/preferences/seed",
				pattern: /^\/api\/preferences\/seed\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/preferences/seed/_server.ts.js'))
			},
			{
				id: "/api/refresh-all",
				pattern: /^\/api\/refresh-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/refresh-all/_server.ts.js'))
			},
			{
				id: "/api/refresh-cr",
				pattern: /^\/api\/refresh-cr\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/refresh-cr/_server.ts.js'))
			},
			{
				id: "/api/rsvp",
				pattern: /^\/api\/rsvp\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/rsvp/_server.ts.js'))
			},
			{
				id: "/api/saved-events",
				pattern: /^\/api\/saved-events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/saved-events/_server.ts.js'))
			},
			{
				id: "/api/scrape",
				pattern: /^\/api\/scrape\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/scrape/_server.ts.js'))
			},
			{
				id: "/api/search",
				pattern: /^\/api\/search\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/search/_server.ts.js'))
			},
			{
				id: "/api/stats",
				pattern: /^\/api\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stats/_server.ts.js'))
			},
			{
				id: "/api/submit-event",
				pattern: /^\/api\/submit-event\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/submit-event/_server.ts.js'))
			},
			{
				id: "/api/subscribe",
				pattern: /^\/api\/subscribe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/subscribe/_server.ts.js'))
			},
			{
				id: "/api/translate",
				pattern: /^\/api\/translate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/translate/_server.ts.js'))
			},
			{
				id: "/api/trending",
				pattern: /^\/api\/trending\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/trending/_server.ts.js'))
			},
			{
				id: "/city/[slug]",
				pattern: /^\/city\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/event/[id]",
				pattern: /^\/event\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/meetups",
				pattern: /^\/meetups\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/submit",
				pattern: /^\/submit\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
