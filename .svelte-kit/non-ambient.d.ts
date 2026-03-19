
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/events" | "/admin/login" | "/admin/scrape" | "/admin/submissions" | "/admin/venues" | "/agenda" | "/api" | "/api/admin" | "/api/admin/submit" | "/api/auth" | "/api/city" | "/api/comments" | "/api/discover" | "/api/events" | "/api/events/by-bounds" | "/api/events/by-ids" | "/api/events/view" | "/api/geocode-city" | "/api/geo" | "/api/greeting" | "/api/meetups" | "/api/preferences" | "/api/preferences/seed" | "/api/refresh-all" | "/api/refresh-cr" | "/api/rsvp" | "/api/saved-events" | "/api/scrape" | "/api/search" | "/api/stats" | "/api/submit-event" | "/api/submit" | "/api/subscribe" | "/api/translate" | "/api/trending" | "/api/venues" | "/city" | "/city/[slug]" | "/events" | "/events/[id]" | "/event" | "/event/[id]" | "/meetups" | "/submit" | "/venues" | "/venues/[id]";
		RouteParams(): {
			"/city/[slug]": { slug: string };
			"/events/[id]": { id: string };
			"/event/[id]": { id: string };
			"/venues/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { slug?: string; id?: string };
			"/admin": Record<string, never>;
			"/admin/events": Record<string, never>;
			"/admin/login": Record<string, never>;
			"/admin/scrape": Record<string, never>;
			"/admin/submissions": Record<string, never>;
			"/admin/venues": Record<string, never>;
			"/agenda": Record<string, never>;
			"/api": Record<string, never>;
			"/api/admin": Record<string, never>;
			"/api/admin/submit": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/city": Record<string, never>;
			"/api/comments": Record<string, never>;
			"/api/discover": Record<string, never>;
			"/api/events": Record<string, never>;
			"/api/events/by-bounds": Record<string, never>;
			"/api/events/by-ids": Record<string, never>;
			"/api/events/view": Record<string, never>;
			"/api/geocode-city": Record<string, never>;
			"/api/geo": Record<string, never>;
			"/api/greeting": Record<string, never>;
			"/api/meetups": Record<string, never>;
			"/api/preferences": Record<string, never>;
			"/api/preferences/seed": Record<string, never>;
			"/api/refresh-all": Record<string, never>;
			"/api/refresh-cr": Record<string, never>;
			"/api/rsvp": Record<string, never>;
			"/api/saved-events": Record<string, never>;
			"/api/scrape": Record<string, never>;
			"/api/search": Record<string, never>;
			"/api/stats": Record<string, never>;
			"/api/submit-event": Record<string, never>;
			"/api/submit": Record<string, never>;
			"/api/subscribe": Record<string, never>;
			"/api/translate": Record<string, never>;
			"/api/trending": Record<string, never>;
			"/api/venues": Record<string, never>;
			"/city": { slug?: string };
			"/city/[slug]": { slug: string };
			"/events": { id?: string };
			"/events/[id]": { id: string };
			"/event": { id?: string };
			"/event/[id]": { id: string };
			"/meetups": Record<string, never>;
			"/submit": Record<string, never>;
			"/venues": { id?: string };
			"/venues/[id]": { id: string }
		};
		Pathname(): "/" | "/admin" | "/agenda" | "/api/admin/submit" | "/api/auth" | "/api/city" | "/api/comments" | "/api/discover" | "/api/events" | "/api/events/by-bounds" | "/api/events/by-ids" | "/api/geocode-city" | "/api/geo" | "/api/greeting" | "/api/meetups" | "/api/preferences" | "/api/preferences/seed" | "/api/refresh-all" | "/api/refresh-cr" | "/api/rsvp" | "/api/saved-events" | "/api/scrape" | "/api/search" | "/api/stats" | "/api/submit-event" | "/api/subscribe" | "/api/translate" | "/api/trending" | `/city/${string}` & {} | `/event/${string}` & {} | "/meetups" | "/submit";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/sw.js" | string & {};
	}
}