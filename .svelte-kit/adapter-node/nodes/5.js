import * as server from '../entries/pages/city/_slug_/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/city/_slug_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/city/[slug]/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.itO5sy17.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/D9rTjJqw.js","_app/immutable/chunks/DLLA9tMu.js","_app/immutable/chunks/C9-fO4Nh.js","_app/immutable/chunks/D5KUf6On.js","_app/immutable/chunks/C1Uq0Uby.js","_app/immutable/chunks/C0xfXwiF.js"];
export const stylesheets = [];
export const fonts = [];
