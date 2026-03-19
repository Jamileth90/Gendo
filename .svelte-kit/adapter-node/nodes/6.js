import * as server from '../entries/pages/event/_id_/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/event/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/event/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.Co31LYTz.js","_app/immutable/chunks/DBxS2dh6.js","_app/immutable/chunks/DLLA9tMu.js","_app/immutable/chunks/C9-fO4Nh.js","_app/immutable/chunks/D5KUf6On.js","_app/immutable/chunks/C1Uq0Uby.js","_app/immutable/chunks/C0xfXwiF.js"];
export const stylesheets = [];
export const fonts = [];
