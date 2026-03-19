import { c as create_ssr_component, b as add_attribute, e as escape, v as validate_component, i as each, d as createEventDispatcher } from './ssr-0v8FJN9_.js';
import { format } from 'date-fns';
import './client-Bl3EK09E.js';
import { g as getUserLang, c as cleanEventTitle, t as translateBatch, a as cleanVenueName, f as formatEventCity, b as formatCityDisplay } from './translate-BDs1bCY5.js';
import './ssr2-R745vEo4.js';

const ExplorerMode = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ` ${``}  ${``}`;
});
const WorldSearchButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  createEventDispatcher();
  let { notifPermission = "default" } = $$props;
  let { citySearchLoading = false } = $$props;
  if ($$props.notifPermission === void 0 && $$bindings.notifPermission && notifPermission !== void 0) $$bindings.notifPermission(notifPermission);
  if ($$props.citySearchLoading === void 0 && $$bindings.citySearchLoading && citySearchLoading !== void 0) $$bindings.citySearchLoading(citySearchLoading);
  return ` <div class="flex items-center gap-2"><button data-world-search class="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-gendo-accent/40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all group" title="Buscar ciudad, pueblo, país o cualquier lugar"><span class="text-base" data-svelte-h="svelte-1gbl3c9">🌍</span> <span class="hidden sm:inline" data-svelte-h="svelte-14s44jt">Buscar lugar</span> <span class="sm:hidden" data-svelte-h="svelte-2wqwzj">Buscar</span></button>  ${notifPermission === "default" ? `<button title="Activar notificaciones" class="p-2.5 rounded-xl bg-gendo-muted hover:bg-gendo-muted/80 border border-white/[0.06] hover:border-gendo-accent/40 text-zinc-400 hover:text-gendo-accent transition-all text-base" data-svelte-h="svelte-1k2b4bn">🔔</button>` : `${notifPermission === "granted" ? `<span class="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-base" title="Notificaciones activas" data-svelte-h="svelte-1ijd0xv">🔔</span>` : ``}`}</div>  ${``}`;
});
const NEAR_ME_RADIUS_KM = 10;
function eventMatchesTime(ev, filter) {
  return true;
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let geoRanked;
  let filteredEvents;
  let featuredNearby;
  let eventsSource;
  let toTranslate;
  let userLocation;
  let userCountryCode;
  let userState;
  let topCities;
  let topCitiesLabel;
  let discoverFiltered;
  let { data } = $$props;
  const typeEmoji = {
    // Categorías globales principales
    pesca: "🐟",
    playa: "🏖️",
    agua: "🐟",
    ciclismo: "🚲",
    outdoor: "🌿",
    verde: "🚲",
    yoga: "🧘",
    zen: "🧘",
    social: "🎉",
    // Tipos específicos
    live_music: "🎵",
    theater: "🎭",
    sports: "🏟️",
    comedy: "😂",
    festival: "🎪",
    food: "🍽️",
    art: "🎨",
    cinema: "🎬",
    cultura: "🏛️",
    gastronomia: "🍴",
    other: "📅"
  };
  const typeLabel = {
    pesca: "Agua y Pesca",
    playa: "Playas",
    agua: "Agua y Pesca",
    ciclismo: "Parques y Bici",
    outdoor: "Al Aire Libre",
    verde: "Parques y Bici",
    yoga: "Yoga y Bienestar",
    zen: "Bienestar",
    social: "Social y Eventos",
    live_music: "Música en Vivo",
    theater: "Teatro",
    sports: "Deportes",
    comedy: "Comedia",
    festival: "Festival",
    food: "Gastronomía",
    art: "Arte",
    cinema: "Cine",
    cultura: "Cultura",
    gastronomia: "Gastronomía",
    other: "Eventos"
  };
  const COLOR_AGUA = {
    badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    active: "bg-blue-600 text-white",
    dot: "bg-blue-400"
  };
  const COLOR_VERDE = {
    badge: "bg-green-500/15 text-green-300 border border-green-500/30",
    active: "bg-green-600 text-white",
    dot: "bg-green-400"
  };
  const COLOR_ZEN = {
    badge: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    active: "bg-purple-600 text-white",
    dot: "bg-purple-400"
  };
  const COLOR_SOCIAL = {
    badge: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
    active: "bg-orange-500 text-white",
    dot: "bg-orange-400"
  };
  const COLOR_OTHER = {
    badge: "bg-gray-500/15 text-gray-300 border border-gray-500/30",
    active: "bg-gray-600 text-white",
    dot: "bg-gray-400"
  };
  const typeColor = {
    // 🔵 Azul — Agua
    pesca: COLOR_AGUA,
    playa: COLOR_AGUA,
    agua: COLOR_AGUA,
    // 🟢 Verde — Parques y Bici
    ciclismo: COLOR_VERDE,
    outdoor: COLOR_VERDE,
    verde: COLOR_VERDE,
    sports: {
      badge: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
      active: "bg-yellow-500 text-white",
      dot: "bg-yellow-400"
    },
    // 🟣 Morado — Yoga y Bienestar
    yoga: COLOR_ZEN,
    zen: COLOR_ZEN,
    // 🟠 Naranja — Social y Eventos
    social: COLOR_SOCIAL,
    live_music: {
      badge: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
      active: "bg-pink-600 text-white",
      dot: "bg-pink-400"
    },
    comedy: {
      badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      active: "bg-amber-500 text-white",
      dot: "bg-amber-400"
    },
    festival: {
      badge: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30",
      active: "bg-fuchsia-600 text-white",
      dot: "bg-fuchsia-400"
    },
    // Resto
    theater: {
      badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
      active: "bg-rose-600 text-white",
      dot: "bg-rose-400"
    },
    food: {
      badge: "bg-lime-500/15 text-lime-300 border border-lime-500/30",
      active: "bg-lime-600 text-white",
      dot: "bg-lime-400"
    },
    art: {
      badge: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
      active: "bg-teal-600 text-white",
      dot: "bg-teal-400"
    },
    cinema: {
      badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
      active: "bg-sky-600 text-white",
      dot: "bg-sky-400"
    },
    cultura: {
      badge: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
      active: "bg-amber-600 text-white",
      dot: "bg-amber-400"
    },
    gastronomia: {
      badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
      active: "bg-rose-600 text-white",
      dot: "bg-rose-400"
    },
    other: COLOR_OTHER
  };
  function getCategoryBadge(type) {
    return typeColor[type] ?? COLOR_OTHER;
  }
  let searchQuery = "";
  let selectedType = "all";
  let timeFilter = "all";
  let locationSearch = "";
  let nearbyBonus = /* @__PURE__ */ new Map();
  let eventDistances = /* @__PURE__ */ new Map();
  const { timeSlot, timeSlotLabel, hasPreferences, persona } = data.rankingContext;
  const PERSONA_LABELS = {
    naturaleza: "🌿 Naturaleza",
    noche: "🌙 Noche",
    cultura: "🎭 Cultura",
    zen: "🧘 Zen"
  };
  const TIME_SLOT_CATEGORIES = {
    morning: ["yoga", "ciclismo", "sports", "pesca"],
    afternoon: ["food", "art", "sports", "festival"],
    evening: ["live_music", "food", "social", "festival"],
    night: ["social", "live_music", "comedy"]
  };
  function getRankBadge(ev) {
    const reasons = ev.rankReasons ?? [];
    const isPreference = reasons.includes("preference");
    const isPersona = reasons.includes("persona");
    const isTime = reasons.includes("time");
    const nearby = ev.isNearby ?? false;
    const timeCategories = TIME_SLOT_CATEGORIES[timeSlot] ?? [];
    const isTimeMatch = isTime && timeCategories.includes(ev.type);
    if (ev.isStarOfDay) return {
      label: `⭐ Estrella del Día`,
      sublabel: ev.starLabel ?? void 0,
      cls: "bg-amber-400/20 text-amber-200 border-amber-400/50",
      star: true
    };
    if (nearby && (isPreference || isPersona)) return {
      label: `📍 Cerca · 🎯 Para ti`,
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      star: false
    };
    if (nearby) return {
      label: ev.distKm != null ? `📍 A ${ev.distKm < 1 ? "<1" : ev.distKm.toFixed(1)} km` : "📍 Cerca de ti",
      cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      star: false
    };
    if (isPersona && isPreference) return {
      label: `🎯 ${PERSONA_LABELS[persona] ?? "Para ti"}`,
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      star: false
    };
    if (isPersona) return {
      label: PERSONA_LABELS[persona] ?? "🎯 Para ti",
      cls: "bg-gendo-accent/20 text-gendo-accent border-gendo-accent/30",
      star: false
    };
    if (isPreference && isTimeMatch) return {
      label: "🎯 Para ti · " + timeSlotLabel.split(" ").slice(1).join(" "),
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      star: false
    };
    if (isPreference) return {
      label: "🎯 Basado en tus gustos",
      cls: "bg-gendo-accent/20 text-gendo-accent border-gendo-accent/30",
      star: false
    };
    if (isTimeMatch) return {
      label: timeSlotLabel,
      cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      star: false
    };
    return null;
  }
  function formatEventDate(ms) {
    const d = new Date(ms);
    const today = /* @__PURE__ */ new Date();
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(today.getDate() + 1);
    const df = format(d, "yyyy-MM-dd");
    if (df === format(today, "yyyy-MM-dd")) return `Today · ${format(d, "h:mm a")}`;
    if (df === format(tomorrow, "yyyy-MM-dd")) return `Tomorrow · ${format(d, "h:mm a")}`;
    return format(d, "MMM d · h:mm a");
  }
  const allTypes = [...new Set(data.upcoming.map((e) => e.type))].sort();
  let savedEventIds = /* @__PURE__ */ new Set();
  let savingEventId = null;
  let userPrefs = [];
  let totalClicks = 0;
  function pct(count) {
    return 0;
  }
  let userLang = "en";
  let translatedTitles = /* @__PURE__ */ new Map();
  function t(title) {
    return translatedTitles.get(title) ?? title;
  }
  let notifPermission = "default";
  let citySearchLoading = false;
  let discoveredPlaces = [];
  let discoveryError = "";
  let discoverFilter = "all";
  const US_STATE_NAMES = {
    IA: "Iowa",
    NY: "Nueva York",
    CA: "California",
    IL: "Illinois",
    FL: "Florida",
    TX: "Texas",
    OH: "Ohio",
    PA: "Pensilvania",
    MI: "Míchigan",
    GA: "Georgia",
    NC: "Carolina del Norte",
    NJ: "Nueva Jersey",
    VA: "Virginia",
    WA: "Washington",
    AZ: "Arizona",
    MA: "Massachusetts",
    TN: "Tennessee",
    IN: "Indiana",
    MO: "Misuri",
    MD: "Maryland",
    WI: "Wisconsin",
    CO: "Colorado",
    MN: "Minnesota",
    SC: "Carolina del Sur"
  };
  const STATE_ABBREV = {
    ...Object.fromEntries(Object.entries(US_STATE_NAMES).map(([k, v]) => [v.toUpperCase(), k])),
    "NEW YORK": "NY",
    "IOWA": "IA",
    "CALIFORNIA": "CA",
    "ILLINOIS": "IL",
    "FLORIDA": "FL"
  };
  function stateMatches(a, b) {
    if (!a || !b) return a === b;
    const na = a.trim().toUpperCase();
    const nb = b.trim().toUpperCase();
    if (na === nb) return true;
    const canonA = STATE_ABBREV[na] ?? na;
    const canonB = STATE_ABBREV[nb] ?? nb;
    return canonA === canonB;
  }
  let subscribeEmail = "";
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    geoRanked = data.upcoming.map((ev) => ({
      ...ev,
      // Suma el bonus de proximidad al score del servidor
      totalScore: ev.score + (nearbyBonus.get(ev.id) ?? 0),
      distKm: eventDistances.get(ev.id) ?? null,
      isNearby: (nearbyBonus.get(ev.id) ?? 0) >= 25
    })).sort(
      (a, b) => b.totalScore - a.totalScore || a.dateStart - b.dateStart
    );
    eventsSource = /* @__PURE__ */ (() => {
      return geoRanked;
    })();
    filteredEvents = eventsSource.filter((ev) => {
      const matchTime = eventMatchesTime();
      return matchTime;
    });
    featuredNearby = (() => {
      return data.featured;
    })();
    {
      if (typeof window !== "undefined") {
        userLang = getUserLang();
      }
    }
    toTranslate = (() => {
      const titles = /* @__PURE__ */ new Set();
      for (const ev of featuredNearby) {
        const t2 = cleanEventTitle(ev.title, ev.cityName);
        if (t2 && t2.length > 2) titles.add(t2);
      }
      for (const ev of filteredEvents.slice(0, 30)) {
        const t2 = cleanEventTitle(ev.title, ev.cityName);
        if (t2 && t2.length > 2) titles.add(t2);
      }
      return Array.from(titles);
    })();
    {
      if (toTranslate.length > 0 && userLang) {
        translateBatch(toTranslate, userLang).then((translations) => {
          const m = /* @__PURE__ */ new Map();
          toTranslate.forEach((t2, i) => m.set(t2, translations[i] ?? t2));
          translatedTitles = m;
        });
      }
    }
    userLocation = /* @__PURE__ */ (() => {
      return null;
    })();
    userCountryCode = userLocation?.countryCode ?? null;
    userState = userLocation?.state ?? null;
    topCities = (() => {
      const all = data.cities;
      const byKey = /* @__PURE__ */ new Map();
      for (const c of all) {
        const key = `${String(c?.name ?? "").trim().toLowerCase()}|${String(c?.countryCode ?? "").trim().toUpperCase()}|${String(c?.state ?? "").trim().toLowerCase()}`;
        const existing = byKey.get(key);
        const ec = Number(c?.event_count ?? 0);
        if (!existing || ec > Number(existing?.event_count ?? 0)) byKey.set(key, c);
      }
      const deduped = Array.from(byKey.values());
      if (userCountryCode) {
        if (userState) {
          const sameState = deduped.filter((c) => c.countryCode === userCountryCode && stateMatches(c.state, userState));
          return sameState.slice(0, 6);
        }
        const sameCountry = deduped.filter((c) => (c.countryCode ?? "").toUpperCase() === (userCountryCode ?? "").toUpperCase());
        return sameCountry.slice(0, 6);
      }
      return deduped.slice(0, 6);
    })();
    topCitiesLabel = (() => {
      if (!userCountryCode) return "🔥 Ciudades más activas";
      const flag = (code) => {
        const offset = 127462 - 65;
        return [...code.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + offset)).join("");
      };
      if (userState) {
        const stateName = US_STATE_NAMES[userState] ?? userState;
        return `${flag(userCountryCode)} Ciudades en ${stateName}`;
      }
      const name = data.cities.find((c) => c.countryCode === userCountryCode)?.country ?? userCountryCode;
      return `${flag(userCountryCode)} Ciudades en ${name}`;
    })();
    discoverFiltered = discoveredPlaces;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-1f7kmp_START -->${$$result.title = `<title>Gendo — What&#39;s Happening Near You</title>`, ""}<meta name="description" content="Discover events, concerts, sports, food &amp; more in any city worldwide."><!-- HEAD_svelte-1f7kmp_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"> <div class="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden"> <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-gendo-accent/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div> <div class="relative z-10 w-full max-w-xl text-center"><h1 class="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white mb-3 sm:mb-4" data-svelte-h="svelte-n0mccv">Gendo</h1> <p class="text-base sm:text-lg text-gendo-text-muted mb-8 sm:mb-10 font-normal" data-svelte-h="svelte-1mb5t2c">What&#39;s happening near you</p>  <div class="relative mb-6"><input type="text" placeholder="Search events, concerts, cities..." class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 text-base sm:text-lg placeholder-zinc-500 focus:outline-none focus:border-gendo-accent/40 focus:bg-white/[0.06] transition-all min-h-[48px]"${add_attribute("value", searchQuery, 0)}> ${``}</div> <button class="text-zinc-500 hover:text-gendo-accent text-sm font-medium transition-colors flex items-center gap-2 mx-auto py-3 min-h-[44px]">Explore events
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg></button>  <div class="mt-12 sm:mt-16 pt-12 sm:pt-16 border-t border-white/[0.06] w-full max-w-sm mx-auto"><p class="text-sm text-zinc-500 mb-3" data-svelte-h="svelte-3rrrfx">Weekly event picks in your inbox</p> <form class="flex flex-col sm:flex-row gap-2"><input type="email" placeholder="you@email.com" class="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 sm:py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-gendo-accent/40 min-h-[44px]"${add_attribute("value", subscribeEmail, 0)}> <button type="submit" ${""} class="px-5 py-3 sm:py-2.5 rounded-xl bg-gendo-cream text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors min-h-[44px]">${escape("Notify me")}</button></form> ${`${``}`}</div></div></div>  <div id="explore" class="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 scroll-mt-8"> <div class="flex flex-wrap items-center justify-between gap-4 mb-10"><div class="flex gap-6 text-sm text-zinc-500"><span><strong class="text-white">${escape(data.stats.total_events)}</strong> events</span> <span><strong class="text-white">${escape(data.stats.total_cities)}</strong> cities</span></div> <button ${""} class="text-xs text-zinc-500 hover:text-gendo-accent disabled:opacity-50 transition-colors">${escape("↻ Refresh data")}</button></div>  <div class="mb-10">${validate_component(WorldSearchButton, "WorldSearchButton").$$render(
      $$result,
      { notifPermission, citySearchLoading },
      {
        notifPermission: ($$value) => {
          notifPermission = $$value;
          $$settled = false;
        },
        citySearchLoading: ($$value) => {
          citySearchLoading = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> ${validate_component(ExplorerMode, "ExplorerMode").$$render($$result, {}, {}, {})}  ${discoveredPlaces.length > 0 || discoveryError ? `<section class="mb-10"><div class="bg-gendo-surface border border-white/[0.06] rounded-2xl overflow-hidden"> <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] gap-3 flex-wrap"><div class="flex items-center gap-2 flex-wrap"><span class="text-xl" data-svelte-h="svelte-y1b6jh">🔍</span> <h2 class="text-lg font-bold text-white" data-svelte-h="svelte-hi0zan">Descubierto cerca de ti</h2> ${`${``}`}  ${``}  ${``}</div> <div class="flex items-center gap-3">${discoveredPlaces.length > 0 ? `<span class="text-xs text-gray-500">${escape(discoverFiltered.length)} lugares</span>` : ``}  ${``}</div></div>  ${`${`${discoveredPlaces.length > 0 ? ` <div class="flex gap-2 px-5 py-3 overflow-x-auto"><button class="${"flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all " + escape(
      "bg-gendo-accent text-white",
      true
    )}">Todos</button> ${each(["agua", "verde", "zen", "social"], (cat) => {
      let count = discoveredPlaces.filter((p) => p.category === cat).length;
      return ` ${count > 0 ? `<button class="${"flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all border " + escape(
        discoverFilter === cat ? cat === "agua" ? "bg-blue-600 text-white border-blue-600" : cat === "verde" ? "bg-green-600 text-white border-green-600" : cat === "zen" ? "bg-purple-600 text-white border-purple-600" : "bg-orange-500 text-white border-orange-500" : "bg-gendo-muted text-gendo-cream/80 border-white/[0.06] hover:bg-gendo-muted/80",
        true
      )}">${escape(cat === "agua" ? "🐟 Agua" : cat === "verde" ? "🚲 Verde" : cat === "zen" ? "🧘 Zen" : "🎉 Social")} <span class="ml-1 opacity-70">${escape(count)}</span> </button>` : ``}`;
    })}</div>  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-5 pb-5">${each(discoverFiltered, (place) => {
      let col = place.category === "agua" ? "border-blue-500/30 hover:border-blue-400" : place.category === "verde" ? "border-green-500/30 hover:border-green-400" : place.category === "zen" ? "border-purple-500/30 hover:border-purple-400" : "border-orange-500/30 hover:border-orange-400";
      return ` <div class="${"bg-gendo-muted/50 border " + escape(col, true) + " rounded-xl p-4 transition-all hover:bg-gendo-muted"}"><div class="flex items-start gap-3"> <div class="${"flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl " + escape(
        place.category === "agua" ? "bg-blue-500/15 text-blue-300" : place.category === "verde" ? "bg-green-500/15 text-green-300" : place.category === "zen" ? "bg-purple-500/15 text-purple-300" : "bg-orange-500/15 text-orange-300",
        true
      )}">${escape(place.style?.emoji ?? "📍")}</div> <div class="flex-1 min-w-0"><p class="text-sm font-semibold text-white leading-tight truncate">${escape(place.title)}</p> ${place.googleCat ? `<p class="text-xs text-gray-400 mt-0.5 truncate">${escape(place.googleCat)}</p>` : ``} ${place.address ? `<p class="text-xs text-gray-500 mt-0.5 truncate">📍 ${escape(place.address)}</p>` : ``} <div class="flex items-center gap-2 mt-1.5 flex-wrap"> <span class="${"text-xs px-1.5 py-0.5 rounded-full border font-medium " + escape(
        place.category === "agua" ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : place.category === "verde" ? "bg-green-500/15 text-green-300 border-green-500/30" : place.category === "zen" ? "bg-purple-500/15 text-purple-300 border-purple-500/30" : "bg-orange-500/15 text-orange-300 border-orange-500/30",
        true
      )}">${escape(place.style?.label ?? place.category)}</span>  ${place.rating ? `<span class="text-xs text-yellow-400">⭐ ${escape(place.rating.toFixed(1))}</span>` : ``} ${place.reviews >= 30 ? `<span class="text-xs text-gray-500">${escape(place.reviews)} reseñas</span>` : ``}</div> </div></div>  ${place.website || place.phone ? `<div class="flex gap-3 mt-3 pt-2.5 border-t border-gray-700/60">${place.website ? `<a${add_attribute("href", place.website, 0)} target="_blank" rel="noopener noreferrer" class="text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors">🌐 Web
												</a>` : ``} ${place.phone ? `<a href="${"tel:" + escape(place.phone, true)}" class="text-xs text-green-400 hover:text-green-300 transition-colors">📞 ${escape(place.phone)} </a>` : ``} </div>` : ``} </div>`;
    })}</div>` : ``}`}`}  ${discoveredPlaces.length > 0 ? `<div class="px-5 pb-2 pt-1"><button class="w-full flex items-center justify-between py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"><span class="flex items-center gap-2">🗺️ ${escape("Ver en el mapa")} <span class="text-xs text-gray-600">${escape(discoveredPlaces.filter((p) => p.lat && p.lng).length)} pines</span></span> <span class="text-xs text-gray-600">${escape("▼")}</span></button> ${``}</div>` : ``}  ${`<div class="px-5 pb-4 text-xs text-gendo-text-muted border-t border-white/[0.06] pt-3 flex flex-wrap items-center justify-between gap-2"><span data-svelte-h="svelte-1tflmd0">Resultados de Google Maps via Apify · Rating ≥ 4.0 ó ≥ 30 reseñas · Caché 24 h por zona</span> ${``}</div>`}</div></section>` : ``}  ${userPrefs.length > 0 ? `<section class="mb-10"><div class="bg-gendo-surface border border-white/[0.06] rounded-2xl p-5"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-2"><span class="text-xl" data-svelte-h="svelte-1to6107">✨</span> <h2 class="text-lg font-bold text-white" data-svelte-h="svelte-1scgyxu">Tus Intereses</h2> <span class="text-xs text-gendo-text-muted bg-gendo-muted px-2 py-0.5 rounded-full">${escape(totalClicks)} clics registrados</span></div> <button class="text-xs text-gray-500 hover:text-red-400 transition-colors" title="Borrar historial" data-svelte-h="svelte-17941tg">✕ Borrar</button></div> <div class="space-y-2.5">${each(userPrefs, (pref, i) => {
      let badge = getCategoryBadge(pref.category), barPct = pct(pref.click_count);
      return `  <div class="flex items-center gap-3"> <span class="text-xs text-gray-500 w-4 text-right flex-shrink-0">${escape(i + 1)}</span>  <span class="flex-shrink-0 w-28 flex items-center gap-1.5 text-sm"><span class="text-base">${escape(typeEmoji[pref.category] ?? "📅")}</span> <span class="${"font-medium " + escape(badge.badge.split(" ").find((c) => c.startsWith("text-")) ?? "text-gray-300", true) + " truncate"}">${escape(typeLabel[pref.category] ?? pref.category)} </span></span>  <div class="flex-1 h-2 bg-gendo-muted rounded-full overflow-hidden"><div class="${"h-full rounded-full transition-all duration-500 " + escape(badge.dot, true)}" style="${"width: " + escape(barPct, true) + "%"}"></div></div>  <div class="flex-shrink-0 flex items-center gap-2 text-xs text-right"><span class="text-gray-400 w-8">${escape(barPct)}%</span> <span class="text-gray-600 w-14">${escape(pref.click_count)} ${escape(pref.click_count === 1 ? "clic" : "clics")}</span></div> </div>`;
    })}</div> <p class="text-xs text-gray-600 mt-4" data-svelte-h="svelte-y1b9r0">Basado en los eventos que has visitado · Se actualiza en tiempo real</p></div></section>` : ``}  ${data.featured.length > 0 || featuredNearby.length > 0 ? `<section class="mb-12"><div class="flex items-center justify-between mb-5 flex-wrap gap-3"><h2 class="text-2xl font-bold text-white" data-svelte-h="svelte-1dzyxju">⭐ Featured Events</h2> ${``}</div> ${featuredNearby.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">${each(featuredNearby, (ev) => {
      return `<a href="${"/event/" + escape(ev.id, true)}" class="group relative bg-gendo-surface border border-white/[0.06] hover:border-gendo-accent/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-gendo-accent/10"> <button ${savingEventId === ev.id ? "disabled" : ""} class="${"absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10 " + escape(
        savedEventIds.has(ev.id) ? "text-red-400 hover:bg-red-500/20" : "text-gray-500 hover:text-red-400 hover:bg-white/5",
        true
      )}"${add_attribute(
        "title",
        savedEventIds.has(ev.id) ? "Quitar de favoritos" : "Guardar en favoritos",
        0
      )}>${savingEventId === ev.id ? `<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle></svg>` : `${savedEventIds.has(ev.id) ? `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>` : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`}`}</button> <div class="flex items-start gap-3"> <div class="${"flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl " + escape(getCategoryBadge(ev.type).badge, true)}">${escape(typeEmoji[ev.type] ?? "📅")}</div> <div class="flex-1 min-w-0"><div class="flex items-center gap-1.5 mb-1 flex-wrap"><span class="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full" data-svelte-h="svelte-nva33x">⭐ Featured</span>  <span class="${"inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium " + escape(getCategoryBadge(ev.type).badge, true)}"><span class="${"w-1.5 h-1.5 rounded-full flex-shrink-0 " + escape(getCategoryBadge(ev.type).dot, true)}"></span> ${escape(typeLabel[ev.type] ?? ev.type)}</span> ${ev.price === "free" ? `<span class="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full" data-svelte-h="svelte-19cysqm">FREE</span>` : ``}</div> <h3 class="font-semibold text-white group-hover:text-gendo-accent transition-colors line-clamp-2">${escape(t(cleanEventTitle(ev.title, ev.cityName)))}</h3> <p class="text-gendo-accent/90 text-xs mt-1">${escape(formatEventDate(ev.dateStart))}</p> ${ev.venueName ? `<button class="text-gray-400 text-xs mt-0.5 truncate text-left w-full hover:text-gendo-accent transition-colors cursor-pointer" title="Abrir en mapa">📍 ${escape(cleanVenueName(ev.venueName, ev.cityName))}</button>` : ``} ${ev.cityName ? `<p class="text-gray-500 text-xs mt-0.5">🌍 ${escape(formatEventCity(ev))}</p>` : ``} <button class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors" title="Cómo llegar"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
									Cómo llegar</button> </div></div> </a>`;
    })}</div>` : `${`${data.featured.length > 0 ? `<p class="text-gray-400 text-sm py-6 text-center" data-svelte-h="svelte-ey9csp">Abre el mapa para ver eventos por zona.</p>` : ``}`}`}</section>` : ``}  <section class="mb-14"><div class="flex items-center justify-between mb-4 flex-wrap gap-2"><div class="flex items-center gap-2"><h2 class="text-base font-semibold text-white">${escape(topCitiesLabel)}</h2> ${userCountryCode ? `<span class="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full" data-svelte-h="svelte-dhb1qy">GPS</span>` : ``}</div> <button class="text-xs text-gendo-text-muted hover:text-gendo-accent transition-colors" data-svelte-h="svelte-1lzx3hh">Search elsewhere →</button></div> ${topCities.length > 0 ? `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">${each(topCities, (city) => {
      let flagOffset = 127462 - 65, cityFlag = city.countryCode ? [...city.countryCode.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + flagOffset)).join("") : "🌍", isLocal = city.countryCode === userCountryCode;
      return `   <button class="${"bg-gendo-surface border rounded-xl p-3 sm:p-4 text-center transition-all hover:bg-white/[0.06] group min-h-[100px] sm:min-h-0 " + escape(
        isLocal ? "border-gendo-accent/40 hover:border-gendo-accent/60 ring-1 ring-gendo-accent/20" : "border-white/[0.06] hover:border-gendo-accent/50",
        true
      )}"><p class="text-2xl mb-1">${escape(cityFlag)}</p> <p class="${"font-semibold text-sm group-hover:text-gendo-accent transition-colors truncate " + escape(isLocal ? "text-gendo-accent/90" : "text-white", true)}">${escape(formatCityDisplay(city))}</p> <p class="text-zinc-500 text-xs mt-0.5 truncate">${escape(city.country)}</p> <p class="text-gendo-accent/80 text-xs mt-1.5 font-medium">${escape(city.event_count)} eventos</p> </button>`;
    })}</div>` : `${userState ? `<p class="text-gray-400 text-sm py-6 text-center">No hay ciudades con eventos en ${escape(US_STATE_NAMES[userState] ?? userState)} por ahora.</p>` : ``}`}</section>  <section><div class="flex items-center justify-between mb-4 flex-wrap gap-2"><h2 class="text-xl sm:text-2xl font-bold text-white">🗓️ ${escape("All Upcoming Events")}</h2> <span class="text-gray-400 text-sm">${``} ${escape(filteredEvents.length)} events
					${``}</span></div>  <div class="flex items-center gap-2 mb-5 p-3 rounded-xl bg-gendo-surface border border-white/[0.06] text-sm flex-wrap"> <span class="text-base">${escape(data.rankingContext.timeSlotLabel.split(" ")[0])}</span> <span class="text-gray-300 font-medium">${escape(data.rankingContext.timeSlotLabel.split(" ").slice(1).join(" "))}</span> ${hasPreferences ? `<span class="text-gray-700" data-svelte-h="svelte-1mihbdf">·</span>  ${persona && persona !== "neutral" ? `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gendo-accent/15 text-gendo-accent border border-gendo-accent/30 font-medium">${escape(PERSONA_LABELS[persona] ?? persona)}</span>` : ``}  ${each(data.rankingContext.topUserCategories, (cat) => {
      return `<span class="${"inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border " + escape(getCategoryBadge(cat).badge, true)}">${escape(typeEmoji[cat] ?? "📅")} ${escape(typeLabel[cat] ?? cat)} </span>`;
    })}  ${`${``}`}` : `<span class="text-gray-600 text-xs ml-1" data-svelte-h="svelte-t3cs01">Usa el onboarding para personalizar el orden</span>`}</div>  <div class="flex flex-col gap-3 mb-6"> <div class="flex flex-wrap gap-1.5 sm:gap-2">${each(["today", "tomorrow", "weekend", "all"], (tf) => {
      let label = tf === "today" ? "Hoy" : tf === "tomorrow" ? "Mañana" : tf === "weekend" ? "Fin de Semana" : "Todos", isActive = timeFilter === tf;
      return `  <button class="${"px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 min-h-[36px] sm:min-h-0 " + escape(
        isActive ? "bg-gendo-accent text-white shadow-md" : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-zinc-300",
        true
      )}">${escape(label)} </button>`;
    })}</div> <div class="flex flex-wrap gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 sm:mx-0 sm:overflow-visible"> <div class="relative flex items-center gap-2">${`${`<div class="relative flex items-center gap-2 bg-gendo-muted border border-white/[0.06] hover:border-gendo-accent focus-within:border-gendo-accent rounded-xl px-4 py-2.5 sm:py-2 text-sm transition-colors min-w-0"><span class="text-gray-500 flex-shrink-0" data-svelte-h="svelte-1kvrawe">🔍</span> <input type="text" placeholder="Ciudad, pueblo o país…" class="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none min-w-0 w-24 sm:w-auto"${add_attribute("value", locationSearch, 0)}> ${``}  <button ${""} class="flex-shrink-0 p-1.5 rounded-lg text-gendo-accent hover:bg-gendo-accent/15 hover:text-white transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center" title="${"Cerca de mí: eventos a " + escape(NEAR_ME_RADIUS_KM, true) + " km"}">${`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>`}</button></div> ${``} ${``}`}`}</div> <div class="flex flex-wrap gap-2"><button class="${"px-3 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 min-h-[44px] sm:min-h-0 " + escape(
      "bg-gendo-accent text-white shadow-md",
      true
    )}">All</button> ${each(allTypes, (t2) => {
      return `<button class="${"px-3 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 flex-shrink-0 min-h-[44px] sm:min-h-0 " + escape(
        selectedType === t2 ? getCategoryBadge(t2).active + " shadow-md" : "bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80",
        true
      )}">${selectedType !== t2 ? `<span class="${"w-2 h-2 rounded-full " + escape(getCategoryBadge(t2).dot, true)}"></span>` : ``} ${escape(typeEmoji[t2] ?? "📅")} ${escape(typeLabel[t2] ?? t2)} </button>`;
    })}</div></div></div>  ${filteredEvents.length === 0 ? `<div class="text-center py-16 text-gray-500"><p class="text-3xl mb-3" data-svelte-h="svelte-dajtkx">🔍</p> <p data-svelte-h="svelte-1qt4qno">No events found for that filter.</p></div>` : `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">${each(filteredEvents, (ev) => {
      let rankBadge = getRankBadge(ev), isStar = ev.isStarOfDay === true;
      return `  <a href="${"/event/" + escape(ev.id, true)}" class="${"group rounded-xl p-4 transition-all hover:shadow-md border relative overflow-hidden " + escape(
        isStar ? "bg-gradient-to-br from-amber-950/60 to-gendo-bg border-amber-500/50 hover:border-amber-400 shadow-amber-900/30 shadow-md ring-1 ring-amber-500/20" : rankBadge ? "bg-gendo-surface border-gendo-accent/30 hover:border-gendo-accent/50 shadow-gendo-accent/5 shadow-sm" : "bg-gendo-surface border-white/[0.06] hover:border-gendo-accent/40",
        true
      )}"> <button ${savingEventId === ev.id ? "disabled" : ""} class="${"absolute top-2 right-2 p-1.5 rounded-full transition-colors z-10 " + escape(
        savedEventIds.has(ev.id) ? "text-red-400 hover:bg-red-500/20" : "text-gray-500 hover:text-red-400 hover:bg-white/5",
        true
      )}"${add_attribute(
        "title",
        savedEventIds.has(ev.id) ? "Quitar de favoritos" : "Guardar en favoritos",
        0
      )}>${savingEventId === ev.id ? `<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle></svg>` : `${savedEventIds.has(ev.id) ? `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>` : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`}`}</button>  ${isStar ? `<div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div> <div class="absolute top-2 right-10 text-amber-400 text-base leading-none select-none" title="Recomendación Estrella del Día" data-svelte-h="svelte-zhot3k">⭐</div>` : ``} <div class="flex items-start gap-3"> <div class="${"flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl " + escape(getCategoryBadge(ev.type).badge, true)}">${escape(typeEmoji[ev.type] ?? "📅")}</div> <div class="${"flex-1 min-w-0 " + escape(isStar ? "pr-5" : "", true)}"><h3 class="${"font-medium " + escape(isStar ? "text-amber-100" : "text-white", true) + " group-hover:text-gendo-accent transition-colors line-clamp-2 text-sm"}">${escape(t(cleanEventTitle(ev.title, ev.cityName)))}</h3>  <div class="flex flex-wrap gap-1.5 mt-1">${rankBadge ? `<span class="${"inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium " + escape(rankBadge.cls, true)}">${escape(rankBadge.label)} </span>` : ``} ${rankBadge?.sublabel ? `<span class="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium bg-amber-500/10 text-amber-300 border-amber-500/30">${escape(rankBadge.sublabel)} </span>` : ``}  ${rankBadge && rankBadge.sublabel ? `<span class="${"inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium " + escape(getCategoryBadge(ev.type).badge, true)}"${add_attribute("title", typeLabel[ev.type] ?? ev.type, 0)}><span class="${"w-1.5 h-1.5 rounded-full flex-shrink-0 " + escape(getCategoryBadge(ev.type).dot, true)}"></span> ${escape(typeLabel[ev.type] ?? ev.type)} </span>` : `<span class="${"inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium " + escape(getCategoryBadge(ev.type).badge, true)}"><span class="text-[10px] leading-none">${escape(typeEmoji[ev.type] ?? "📅")}</span> ${escape(typeLabel[ev.type] ?? ev.type)} </span>`}</div> <p class="${escape(isStar ? "text-amber-300" : "text-gendo-accent/80", true) + " text-xs mt-1"}">${escape(formatEventDate(ev.dateStart))}</p> <div class="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-400">${ev.venueName ? `<button class="hover:text-gendo-accent transition-colors cursor-pointer" title="Abrir en mapa">📍 ${escape(cleanVenueName(ev.venueName, ev.cityName).slice(0, 25))}</button>` : ``} ${ev.cityName ? `<span>· ${escape(formatEventCity(ev))}</span>` : ``} ${ev.price === "free" ? `<span class="text-green-400 font-medium" data-svelte-h="svelte-1eg6ar6">FREE</span>` : `${ev.priceAmount ? `<span class="text-yellow-400">$${escape(ev.priceAmount)}</span>` : ``}`}</div> <button class="mt-2 inline-flex items-center gap-1 text-xs text-gendo-accent hover:text-gendo-accent/80 transition-colors" title="Cómo llegar"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
										Cómo llegar</button> </div></div> </a>`;
    })}</div>`}</section></div>  <footer class="border-t border-white/[0.06] mt-16 sm:mt-20 py-8 sm:py-10 px-4 sm:px-6"><div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500"><p data-svelte-h="svelte-k92ooz">Gendo</p> <nav class="flex flex-wrap justify-center gap-4 sm:gap-6"><a href="/agenda" class="hover:text-white transition-colors" data-svelte-h="svelte-1arm3b5">Agenda</a> <a href="/meetups" class="hover:text-white transition-colors" data-svelte-h="svelte-1b5rsrd">Meetups</a> <a href="/submit" class="hover:text-white transition-colors" data-svelte-h="svelte-cdpnb5">Submit</a> <a href="/admin" class="hover:text-white transition-colors py-2 sm:py-0" data-svelte-h="svelte-i48l3x">Admin</a></nav></div></footer></div>`;
  } while (!$$settled);
  return $$rendered;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-BGFxmxs0.js.map
