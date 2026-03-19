import { c as create_ssr_component, e as escape, i as each, b as add_attribute } from './ssr-0v8FJN9_.js';
import { format } from 'date-fns';
import { g as getUserLang, c as cleanEventTitle, t as translateBatch, b as formatCityDisplay, a as cleanVenueName } from './translate-BDs1bCY5.js';

function eventMatchesTime(ev, filter) {
  return true;
}
function parseTags(tags) {
  if (!tags) return [];
  try {
    return JSON.parse(tags).slice(0, 4);
  } catch {
    return [];
  }
}
function formatPrice(ev) {
  if (ev.price === "free") return "FREE";
  if (ev.priceAmount) return `$${ev.priceAmount}`;
  return ev.price === "paid" ? "Paid" : "";
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredEvents;
  let todayCount;
  let groupedEvents;
  let sortedDates;
  let toTranslate;
  let uniqueTitles;
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
  const typeLabel = {
    live_music: "Live Music",
    theater: "Theater",
    sports: "Sports",
    comedy: "Comedy",
    festival: "Festival",
    food: "Food & Drink",
    art: "Art",
    cinema: "Cinema",
    other: "Events"
  };
  const travelEmoji = {
    backpacker: "🎒",
    nomad: "💻",
    solo_traveler: "🧭",
    traveler: "✈️",
    local: "📍",
    expat: "🌍"
  };
  let searchQuery = "";
  let timeFilter = "all";
  let savedEventIds = /* @__PURE__ */ new Set();
  let savingEventId = null;
  const todayKey = format(
    /* @__PURE__ */ new Date(),
    "yyyy-MM-dd"
  );
  const isCedarRapids = data.city.name.toLowerCase().includes("cedar rapids");
  function formatDateHeader(dateKey) {
    const d = /* @__PURE__ */ new Date(dateKey + "T12:00:00");
    const today = /* @__PURE__ */ new Date();
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "🗓️ Today";
    if (format(d, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) return "🗓️ Tomorrow";
    return format(d, "EEEE, MMMM d, yyyy");
  }
  data.city.name.toLowerCase().replace(/\s+/g, "-");
  let userLang = "en";
  let translatedTitles = /* @__PURE__ */ new Map();
  function t(title) {
    return translatedTitles.get(title) ?? title;
  }
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  filteredEvents = data.events.filter((ev) => {
    const matchTime = eventMatchesTime();
    return matchTime;
  });
  todayCount = data.events.filter((ev) => format(new Date(ev.dateStart), "yyyy-MM-dd") === todayKey).length;
  groupedEvents = filteredEvents.reduce(
    (acc, ev) => {
      const d = new Date(ev.dateStart);
      const key = format(d, "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    },
    {}
  );
  sortedDates = Object.keys(groupedEvents).sort();
  {
    if (typeof window !== "undefined") userLang = getUserLang();
  }
  toTranslate = filteredEvents.slice(0, 50).map((ev) => cleanEventTitle(ev.title, data.city.name)).filter((t2) => t2 && t2.length > 2);
  uniqueTitles = [...new Set(toTranslate)];
  {
    if (uniqueTitles.length > 0 && userLang) {
      translateBatch(uniqueTitles, userLang).then((translations) => {
        const m = /* @__PURE__ */ new Map();
        uniqueTitles.forEach((t2, i) => m.set(t2, translations[i] ?? t2));
        translatedTitles = m;
      });
    }
  }
  return `${$$result.head += `<!-- HEAD_svelte-1ig3oiy_START -->${$$result.title = `<title>${escape(formatCityDisplay(data.city))} — Events, Meetups &amp; More | Gendo</title>`, ""}<!-- HEAD_svelte-1ig3oiy_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"> <div class="bg-gradient-to-br from-gendo-surface via-gendo-muted to-gendo-bg py-6 sm:py-10 px-4 sm:px-6"><div class="max-w-6xl mx-auto"><a href="/" class="text-gendo-accent hover:text-white text-sm mb-3 inline-block py-2" data-svelte-h="svelte-wlu9qe">← Gendo</a> <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div class="min-w-0"><h1 class="text-3xl sm:text-4xl font-bold text-white truncate">${escape(formatCityDisplay(data.city))}</h1> <p class="text-gendo-cream/80 mt-1">${escape(data.city.country)}
						· ${escape(data.events.length)} upcoming events</p> <div class="flex flex-wrap gap-2 mt-3">${each(data.typeCounts, (tc) => {
    return `<span class="bg-white/10 px-3 py-1 rounded-full text-sm text-white/80">${escape(typeEmoji[tc.type] ?? "📅")} ${escape(typeLabel[tc.type] ?? tc.type)} (${escape(tc.count)})
							</span>`;
  })}</div></div> <div class="flex gap-3 flex-wrap">${isCedarRapids ? `<button ${""} class="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">${`🔄`}
							Refresh events</button>` : ``} <a href="${"/meetups?city=" + escape(encodeURIComponent(data.city.name), true)}" class="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">🤝 Meetups (${escape(data.meetups.length)})</a> <a href="${"/meetups?city=" + escape(encodeURIComponent(data.city.name), true)}" class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm transition-colors">+ Post Meetup</a></div></div></div></div> <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"> ${data.meetups.length > 0 ? `<div class="mb-8 bg-gendo-surface border border-gendo-accent/30 rounded-2xl p-5"><div class="flex items-center justify-between mb-4"><h2 class="font-semibold text-white">🤝 Traveler Meetups in ${escape(formatCityDisplay(data.city))}</h2> <a href="${"/meetups?city=" + escape(encodeURIComponent(data.city.name), true)}" class="text-sm text-purple-400 hover:text-purple-300">See all →</a></div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${each(data.meetups.slice(0, 3), (meetup) => {
    return `<div class="bg-gendo-muted rounded-xl p-3 border border-white/[0.06]"><div class="flex items-center gap-2 mb-2"><img${add_attribute("src", meetup.avatar_url ?? `https://ui-avatars.com/api/?name=${meetup.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", meetup.username, 0)} class="w-6 h-6 rounded-full"> <span class="text-xs text-gray-400">${escape(meetup.display_name ?? meetup.username)} ${escape(travelEmoji[meetup.travel_style] ?? "✈️")}</span></div> <p class="text-white text-sm font-medium line-clamp-2">${escape(meetup.title)}</p> <p class="text-gray-400 text-xs mt-1">📍 ${escape(meetup.location_name)} · 👥 ${escape(meetup.attendee_count)}/${escape(meetup.max_people)}</p> <p class="text-gendo-accent text-xs mt-1">${escape(format(new Date(meetup.date_start * 1e3), "MMM d, h:mm a"))}</p> </div>`;
  })}</div></div>` : `<div class="mb-8 bg-gendo-surface border border-white/[0.06] border-dashed rounded-2xl p-5 text-center"><p class="text-gray-400">🤝 No traveler meetups yet in ${escape(formatCityDisplay(data.city))}.</p> <a href="${"/meetups?city=" + escape(encodeURIComponent(data.city.name), true)}" class="text-gendo-accent hover:text-gendo-accent/80 text-sm mt-1 inline-block">Be the first to post one →</a></div>`}  ${``}  <div class="mb-6 flex flex-wrap gap-2">${each(["today", "tomorrow", "weekend", "all"], (tf) => {
    let label = tf === "today" ? "Hoy" : tf === "tomorrow" ? "Mañana" : tf === "weekend" ? "Fin de Semana" : "Todos", isActive = timeFilter === tf;
    return `  <button class="${"px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 min-h-[40px] " + escape(
      isActive ? "bg-gendo-accent text-white shadow-md" : "bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80 border border-white/[0.06]",
      true
    )}">${escape(label)} </button>`;
  })}</div>  ${todayCount > 0 && timeFilter !== "today" ? `<div class="mb-6 p-4 rounded-xl bg-emerald-950/50 border border-emerald-700/40"><div class="flex items-center justify-between flex-wrap gap-3"><div class="flex items-center gap-2"><span class="text-2xl" data-svelte-h="svelte-n4rwoe">🕐</span> <div><h3 class="font-semibold text-emerald-100">Happening today in ${escape(formatCityDisplay(data.city))}</h3> <p class="text-sm text-emerald-300/80">${escape(todayCount)} event${escape(todayCount === 1 ? "" : "s")} right now</p></div></div> <button class="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50" data-svelte-h="svelte-19wyc40">Ver solo hoy</button></div></div>` : ``}  <div class="flex flex-col sm:flex-row gap-3 mb-6"><input type="text" placeholder="Search events, breweries, St. Patrick's..." class="flex-1 bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 min-h-[44px] focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted"${add_attribute("value", searchQuery, 0)}> <select class="bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 min-h-[44px] focus:outline-none focus:border-gendo-accent"><option value="all" data-svelte-h="svelte-7jahaz">All Types</option>${each(data.typeCounts, (tc) => {
    return `<option${add_attribute("value", tc.type, 0)}>${escape(typeEmoji[tc.type] ?? "📅")} ${escape(typeLabel[tc.type] ?? tc.type)}</option>`;
  })}</select></div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8"> <div class="lg:col-span-2">${filteredEvents.length === 0 ? `<div class="text-center text-gray-400 py-16"><p class="text-2xl mb-2" data-svelte-h="svelte-c3gzt7">🔍</p> <p data-svelte-h="svelte-1qt4qno">No events found for that filter.</p></div>` : `${each(sortedDates, (dateKey) => {
    return `<div class="mb-8"><h2 class="text-lg font-semibold text-gendo-accent mb-3 pb-2 border-b border-white/[0.06]">${escape(formatDateHeader(dateKey))}</h2> <div class="space-y-3">${each(groupedEvents[dateKey], (ev) => {
      return `<a href="${"/event/" + escape(ev.id, true)}" class="block bg-gendo-surface border border-white/[0.06] rounded-xl p-4 hover:border-gendo-accent/50 transition-colors group relative"> <button ${savingEventId === ev.id ? "disabled" : ""} class="${"absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10 " + escape(
        savedEventIds.has(ev.id) ? "text-red-400 hover:bg-red-500/20" : "text-gray-500 hover:text-red-400 hover:bg-white/5",
        true
      )}"${add_attribute(
        "title",
        savedEventIds.has(ev.id) ? "Quitar de favoritos" : "Guardar en favoritos",
        0
      )}>${savingEventId === ev.id ? `<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle></svg>` : `${savedEventIds.has(ev.id) ? `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>` : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`}`}</button> <div class="flex items-start gap-3"><div class="text-2xl flex-shrink-0 mt-0.5">${escape(typeEmoji[ev.type] ?? "📅")}</div> <div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap">${ev.featured ? `<span class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full" data-svelte-h="svelte-1paqade">⭐ Featured</span>` : ``} <h3 class="font-semibold text-white group-hover:text-gendo-accent transition-colors">${escape(t(cleanEventTitle(ev.title, data.city.name)))}</h3></div> <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-400">${ev.venueName ? `<button class="hover:text-gendo-accent transition-colors cursor-pointer text-left" title="Abrir en mapa">📍 ${escape(cleanVenueName(ev.venueName, data.city.name))}</button>` : ``} <span>🕐 ${escape(format(new Date(ev.dateStart), "h:mm a"))}</span> ${ev.price ? `<span${add_attribute(
        "class",
        ev.price === "free" ? "text-green-400 font-medium" : "text-yellow-400",
        0
      )}>${escape(formatPrice(ev))}</span>` : ``}</div> ${ev.description ? `<p class="mt-1.5 text-sm text-gray-400 line-clamp-2">${escape(ev.description)}</p>` : ``} ${parseTags(ev.tags).length > 0 ? `<div class="flex flex-wrap gap-1 mt-1.5">${each(parseTags(ev.tags), (tag) => {
        return `<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#${escape(tag)}</span>`;
      })} </div>` : ``} <button class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors" title="Cómo llegar"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
													Cómo llegar
												</button></div> <span class="text-gendo-accent text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" data-svelte-h="svelte-1krqvm0">→</span></div> </a>`;
    })}</div> </div>`;
  })}`}</div>  <div><h2 class="text-base font-semibold text-white mb-3">🏟️ Venues in ${escape(formatCityDisplay(data.city))}</h2> <div class="space-y-2">${each(data.venues, (venue) => {
    return `<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-3 hover:border-gendo-accent/30 transition-colors"><div class="flex items-start gap-2"><span class="text-lg flex-shrink-0">${venue.type === "stadium" ? `🏟️` : `${venue.type === "theater" ? `🎭` : `${venue.type === "bar" ? `🍺` : `${venue.type === "restaurant" ? `🍽️` : `${venue.type === "outdoor" ? `🌳` : `📍`}`}`}`}`}</span> <div class="min-w-0 flex-1"><div class="flex items-center gap-1"><span class="font-medium text-white text-sm">${escape(venue.name)}</span> ${venue.verified ? `<span class="text-blue-400 text-xs" data-svelte-h="svelte-19vvbim">✓</span>` : ``}</div> ${venue.address ? `<p class="text-xs text-gray-500 truncate">${escape(venue.address)}</p>` : ``} <div class="flex gap-2 mt-1">${venue.website ? `<a${add_attribute("href", venue.website, 0)} target="_blank" rel="noopener" class="text-xs text-gendo-accent hover:text-gendo-accent/80">Website →</a>` : ``} ${venue.instagram ? `<a href="${"https://instagram.com/" + escape(venue.instagram, true)}" target="_blank" rel="noopener" class="text-xs text-pink-400">@${escape(venue.instagram)}</a>` : ``}</div> </div></div> </div>`;
  })}</div>  ${data.city.lat && data.city.lng ? `<div class="mt-4 bg-gendo-surface border border-white/[0.06] rounded-xl p-3"><a href="${"https://www.openstreetmap.org/?mlat=" + escape(data.city.lat, true) + "&amp;mlon=" + escape(data.city.lng, true) + "#map=13/" + escape(data.city.lat, true) + "/" + escape(data.city.lng, true)}" target="_blank" rel="noopener" class="text-sm text-gendo-accent hover:text-gendo-accent/80">📍 Open Map of ${escape(formatCityDisplay(data.city))} →</a></div>` : ``}</div></div></div></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-DvnmkHwB.js.map
