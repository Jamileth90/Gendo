import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.pmD77gHL.js","_app/immutable/chunks/BE8ZFAd5.js","_app/immutable/chunks/dmTUBUWm.js","_app/immutable/chunks/CfbypVtt.js","_app/immutable/chunks/DRmI5L_L.js","_app/immutable/chunks/C_7BppP2.js","_app/immutable/chunks/C9-fO4Nh.js","_app/immutable/chunks/C0xfXwiF.js"];
export const stylesheets = ["_app/immutable/assets/0.p-KRWv9B.css"];
export const fonts = [];
