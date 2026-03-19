import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.Be9BDOvj.js","_app/immutable/chunks/BE8ZFAd5.js","_app/immutable/chunks/dmTUBUWm.js","_app/immutable/chunks/D9rTjJqw.js","_app/immutable/chunks/DRmI5L_L.js","_app/immutable/chunks/C9-fO4Nh.js","_app/immutable/chunks/C0xfXwiF.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/C_7BppP2.js","_app/immutable/chunks/D5KUf6On.js","_app/immutable/chunks/C1Uq0Uby.js"];
export const stylesheets = [];
export const fonts = [];
