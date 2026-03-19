const manifest = (() => {
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
			__memo(() => import('./chunks/0-7n3Lo4_d.js')),
			__memo(() => import('./chunks/1-CmGZUUyE.js')),
			__memo(() => import('./chunks/2-D7fBwNvx.js')),
			__memo(() => import('./chunks/3-DDS7pooR.js')),
			__memo(() => import('./chunks/4-BcUZcUCM.js')),
			__memo(() => import('./chunks/5-Bcq0yBdf.js')),
			__memo(() => import('./chunks/6-2PQtkHtj.js')),
			__memo(() => import('./chunks/7-DGUFbCCM.js')),
			__memo(() => import('./chunks/8-Br7CoZU1.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-AmAytOLC.js'))
			},
			{
				id: "/api/auth",
				pattern: /^\/api\/auth\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CdUHMUbv.js'))
			},
			{
				id: "/api/city",
				pattern: /^\/api\/city\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-3G4bjTO-.js'))
			},
			{
				id: "/api/comments",
				pattern: /^\/api\/comments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CS52XzwR.js'))
			},
			{
				id: "/api/discover",
				pattern: /^\/api\/discover\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BtRGbBTW.js'))
			},
			{
				id: "/api/events",
				pattern: /^\/api\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CnM6XQE0.js'))
			},
			{
				id: "/api/events/by-bounds",
				pattern: /^\/api\/events\/by-bounds\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-qQJOxsLu.js'))
			},
			{
				id: "/api/events/by-ids",
				pattern: /^\/api\/events\/by-ids\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B-rXAMKC.js'))
			},
			{
				id: "/api/geocode-city",
				pattern: /^\/api\/geocode-city\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CtwmG4iq.js'))
			},
			{
				id: "/api/geo",
				pattern: /^\/api\/geo\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B-KEPDpC.js'))
			},
			{
				id: "/api/greeting",
				pattern: /^\/api\/greeting\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cea43YGq.js'))
			},
			{
				id: "/api/meetups",
				pattern: /^\/api\/meetups\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-krFyb9GS.js'))
			},
			{
				id: "/api/preferences",
				pattern: /^\/api\/preferences\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CgvfK9Ts.js'))
			},
			{
				id: "/api/preferences/seed",
				pattern: /^\/api\/preferences\/seed\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CPqbDVUP.js'))
			},
			{
				id: "/api/refresh-all",
				pattern: /^\/api\/refresh-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-uoY-Bz-u.js'))
			},
			{
				id: "/api/refresh-cr",
				pattern: /^\/api\/refresh-cr\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CD4VZZB2.js'))
			},
			{
				id: "/api/rsvp",
				pattern: /^\/api\/rsvp\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-9DCPWYeX.js'))
			},
			{
				id: "/api/saved-events",
				pattern: /^\/api\/saved-events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BSdqZfOE.js'))
			},
			{
				id: "/api/scrape",
				pattern: /^\/api\/scrape\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CgIZaZ8F.js'))
			},
			{
				id: "/api/search",
				pattern: /^\/api\/search\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BDdtzOhO.js'))
			},
			{
				id: "/api/stats",
				pattern: /^\/api\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQqW6VLf.js'))
			},
			{
				id: "/api/submit-event",
				pattern: /^\/api\/submit-event\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DpY-TsZh.js'))
			},
			{
				id: "/api/subscribe",
				pattern: /^\/api\/subscribe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D30K6u8J.js'))
			},
			{
				id: "/api/translate",
				pattern: /^\/api\/translate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CUxkMxRY.js'))
			},
			{
				id: "/api/trending",
				pattern: /^\/api\/trending\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BYLIBlMb.js'))
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

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
