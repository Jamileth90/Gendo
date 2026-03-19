import { c as create_ssr_component, e as escape, i as each } from './ssr-0v8FJN9_.js';
import './client-Bl3EK09E.js';
import { format } from 'date-fns';
import './ssr2-R745vEo4.js';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const typeEmoji = {
    live_music: "🎵",
    theater: "🎭",
    sports: "🏟️",
    comedy: "😂",
    festival: "🎪",
    food: "🍽️",
    art: "🎨",
    cinema: "🎬",
    other: "📅"
  };
  let pending = data.pending;
  let processing = /* @__PURE__ */ new Set();
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `${$$result.head += `<!-- HEAD_svelte-18kdb0k_START -->${$$result.title = `<title>Admin | Gendo</title>`, ""}<!-- HEAD_svelte-18kdb0k_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"><div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"><a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block" data-svelte-h="svelte-qmacs1">← Gendo</a> <h1 class="text-3xl font-bold mb-8" data-svelte-h="svelte-uw83c2">⚙️ Admin</h1>  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"><div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4"><p class="text-2xl font-bold text-gendo-accent">${escape(data.stats.totalEvents)}</p> <p class="text-sm text-gray-500" data-svelte-h="svelte-1v3i28x">Events</p></div> <div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4"><p class="text-2xl font-bold text-gendo-accent">${escape(data.stats.totalCities)}</p> <p class="text-sm text-gray-500" data-svelte-h="svelte-vfykzj">Cities</p></div> <div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4"><p class="text-2xl font-bold text-gendo-accent">${escape(data.stats.totalVenues)}</p> <p class="text-sm text-gray-500" data-svelte-h="svelte-3w7f2i">Venues</p></div> <div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4"><p class="text-2xl font-bold text-amber-400">${escape(data.stats.pendingSubmissions)}</p> <p class="text-sm text-gray-500" data-svelte-h="svelte-1l99nnp">Pending</p></div></div>  <div class="mb-10"><h2 class="text-lg font-semibold mb-3" data-svelte-h="svelte-1yrj1av">Events by source</h2> <div class="flex flex-wrap gap-2">${each(data.bySource, (s) => {
    return `<span class="bg-gendo-muted px-3 py-1 rounded-lg text-sm text-gendo-cream/80">${escape(s.source)}: ${escape(s.n)} </span>`;
  })}</div></div>  <div class="mb-10"><a href="/" class="inline-flex items-center gap-2 bg-gendo-accent hover:bg-gendo-accent/90 text-white px-4 py-2 rounded-xl text-sm font-medium" data-svelte-h="svelte-184yjsx">🔄 Refresh all data (from home)</a></div>  <div><h2 class="text-lg font-semibold mb-4" data-svelte-h="svelte-1rdzzzv">Pending submissions</h2> ${pending.length === 0 ? `<p class="text-gray-500 py-8" data-svelte-h="svelte-hoz3ul">No pending submissions.</p>` : `<div class="space-y-4">${each(pending, (sub) => {
    return `<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4"><div class="flex items-start justify-between gap-4 flex-wrap"><div class="flex-1 min-w-0"><h3 class="font-semibold text-white">${escape(sub.title)}</h3> <div class="flex flex-wrap gap-2 mt-1 text-sm text-gray-400"><span>${escape(typeEmoji[sub.type] ?? "📅")} ${escape(sub.type)}</span> <span>📍 ${escape(sub.city_name)}</span> ${sub.venue_name ? `<span>@ ${escape(sub.venue_name)}</span>` : ``} <span>🕐 ${escape(format(new Date(sub.date_start * 1e3), "MMM d, yyyy h:mm a"))}</span> ${sub.price === "free" ? `<span class="text-green-400" data-svelte-h="svelte-1t3mqhj">FREE</span>` : `${sub.price_amount ? `<span>$${escape(sub.price_amount)}</span>` : ``}`}</div> ${sub.description ? `<p class="mt-2 text-sm text-gray-500 line-clamp-2">${escape(sub.description)}</p>` : ``} ${sub.submitter_email ? `<p class="mt-1 text-xs text-gray-600">From: ${escape(sub.submitter_email)}</p>` : ``}</div> <div class="flex gap-2 flex-shrink-0"><button ${processing.has(sub.id) ? "disabled" : ""} class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Approve</button> <button ${processing.has(sub.id) ? "disabled" : ""} class="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 px-3 py-1.5 rounded-lg text-sm font-medium">Reject</button> </div></div> </div>`;
  })}</div>`}</div></div></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-BOhSBaqk.js.map
