import * as server from '../entries/pages/submit/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/submit/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/submit/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.CPuK3YZL.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js"];
export const stylesheets = [];
export const fonts = [];
