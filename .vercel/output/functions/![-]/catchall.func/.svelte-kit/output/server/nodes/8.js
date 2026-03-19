import * as server from '../entries/pages/submit/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/submit/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/submit/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.BFmHK5Vv.js","_app/immutable/chunks/BE8ZFAd5.js","_app/immutable/chunks/dmTUBUWm.js"];
export const stylesheets = [];
export const fonts = [];
