import * as server from '../entries/pages/admin/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.CeEwExBm.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js","_app/immutable/chunks/DwFuaow-.js","_app/immutable/chunks/C0xfXwiF.js"];
export const stylesheets = [];
export const fonts = [];
