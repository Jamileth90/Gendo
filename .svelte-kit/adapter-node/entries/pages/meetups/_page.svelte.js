import { c as create_ssr_component, e as escape, i as each, d as add_attribute } from "../../../chunks/ssr.js";
import { format } from "date-fns";
import "../../../chunks/client.js";
function timeAgo(ts) {
  const diff = Date.now() / 1e3 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function parseTags(tags) {
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let meetups = data.meetups;
  data.currentUser;
  let city = data.city;
  const travelEmoji = {
    backpacker: "🎒",
    nomad: "💻",
    solo_traveler: "🧭",
    traveler: "✈️",
    local: "📍",
    expat: "🌍"
  };
  const travelLabel = {
    backpacker: "Backpacker",
    nomad: "Digital Nomad",
    solo_traveler: "Solo Traveler",
    traveler: "Traveler",
    local: "Local",
    expat: "Expat"
  };
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `${$$result.head += `<!-- HEAD_svelte-1cs17xp_START -->${$$result.title = `<title>${escape(city ? `Meetups in ${city.name}` : "Traveler Meetups")} — Gendo</title>`, ""}<!-- HEAD_svelte-1cs17xp_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"> <div class="bg-gradient-to-br from-gendo-surface via-gendo-muted to-gendo-bg py-10 px-4"><div class="max-w-5xl mx-auto"><a href="/" class="text-gendo-accent hover:text-white text-sm mb-4 inline-block" data-svelte-h="svelte-b55deb">← Gendo</a> <div class="flex items-start justify-between gap-4 flex-wrap"><div><h1 class="text-3xl font-bold text-white">🤝 Traveler Meetups
						${city ? `in ${escape(city.name)}` : ``}</h1> <p class="text-gendo-cream/80 mt-1">Connect with backpackers, nomads &amp; solo travelers.
						${city ? `Meetups in ${escape(city.name)}, ${escape(city.state ?? city.country)}.` : `Browse meetups worldwide or filter by city.`}</p></div> <button class="bg-gendo-accent hover:bg-gendo-accent/90 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors" data-svelte-h="svelte-19bbau6">+ Post a Meetup</button></div>  ${data.popularCities.length > 0 ? `<div class="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide"><a href="/meetups" class="${"flex-shrink-0 px-3 py-1.5 rounded-full text-sm " + escape(
    !city ? "bg-gendo-accent text-white font-medium" : "bg-white/10 text-white/70 hover:bg-white/20",
    true
  )}">All</a> ${each(data.popularCities, (c) => {
    return `<a href="${"/meetups?city=" + escape(encodeURIComponent(c.name), true)}" class="${"flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap " + escape(
      city?.id === c.id ? "bg-gendo-accent text-white font-medium" : "bg-white/10 text-white/70 hover:bg-white/20",
      true
    )}">${escape(c.name)} ${c.meetup_count > 0 ? `<span class="ml-1 opacity-60">(${escape(c.meetup_count)})</span>` : ``} </a>`;
  })}</div>` : ``}</div></div> <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8"> ${``}  ${meetups.length === 0 ? `<div class="text-center py-16"><p class="text-4xl mb-3" data-svelte-h="svelte-1peo7o2">🏝️</p> <p class="text-xl text-white mb-2">No meetups yet${escape(city ? ` in ${city.name}` : "")}</p> <p class="text-gray-400 mb-5" data-svelte-h="svelte-kdhdpf">Be the first! Post a meetup and connect with other travelers.</p> <button class="bg-gendo-accent hover:bg-gendo-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors" data-svelte-h="svelte-1unho2n">Post the First Meetup</button></div>` : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${each(meetups, (meetup) => {
    return `<div class="bg-gendo-surface border border-white/[0.06] hover:border-gendo-accent/40 rounded-2xl p-5 transition-colors"> <div class="flex items-center gap-2 mb-3"><img${add_attribute("src", meetup.avatar_url ?? `https://ui-avatars.com/api/?name=${meetup.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", meetup.username, 0)} class="w-8 h-8 rounded-full"> <div><span class="text-white text-sm font-medium">${escape(meetup.display_name ?? meetup.username)}</span> <span class="text-xs text-gray-500 ml-1">${escape(travelEmoji[meetup.travel_style] ?? "✈️")} ${escape(travelLabel[meetup.travel_style] ?? "Traveler")}</span> ${meetup.home_country ? `<span class="text-xs text-gray-500">· ${escape(meetup.home_country)}</span>` : ``}</div> <span class="ml-auto text-xs text-gray-600">${escape(timeAgo(meetup.created_at))}</span></div> <h3 class="font-semibold text-white text-base leading-snug mb-1">${escape(meetup.title)}</h3> ${meetup.description ? `<p class="text-gray-400 text-sm line-clamp-2 mb-3">${escape(meetup.description)}</p>` : ``}  <div class="space-y-1 mb-3"><div class="flex items-center gap-1.5 text-sm text-gray-300"><span data-svelte-h="svelte-m26kto">📍</span> <span class="font-medium">${escape(meetup.location_name)}</span></div> ${meetup.location_address ? `<p class="text-xs text-gray-500 pl-5">${escape(meetup.location_address)}</p>` : ``} <div class="flex items-center gap-1.5 text-sm text-gray-300"><span data-svelte-h="svelte-1tqcvic">📅</span> <span>${escape(format(new Date(meetup.date_start * 1e3), "EEE, MMM d · h:mm a"))}</span></div> <div class="flex items-center gap-1.5 text-sm"><span data-svelte-h="svelte-240bj8">👥</span> <span${add_attribute(
      "class",
      meetup.attendee_count >= meetup.max_people ? "text-red-400" : "text-gray-300",
      0
    )}>${escape(meetup.attendee_count)} / ${escape(meetup.max_people)} ${escape(meetup.attendee_count >= meetup.max_people ? " (Full)" : " going")}</span> </div></div>  ${parseTags(meetup.tags).length > 0 ? `<div class="flex flex-wrap gap-1 mb-3">${each(parseTags(meetup.tags), (tag) => {
      return `<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#${escape(tag)}</span>`;
    })} </div>` : ``}  ${meetup.user_attending ? `<button class="w-full py-2 rounded-xl text-sm font-medium bg-green-500/20 text-green-300 border border-green-600/40 hover:bg-red-900/30 hover:text-red-300 hover:border-red-600/40 transition-all" data-svelte-h="svelte-xed333">✅ You&#39;re going · Leave
							</button>` : `${meetup.attendee_count >= meetup.max_people || meetup.status === "full" ? `<button disabled class="w-full py-2 rounded-xl text-sm font-medium bg-gendo-muted text-gendo-text-muted border border-white/[0.06] cursor-not-allowed" data-svelte-h="svelte-odnvxi">🔒 Full
							</button>` : `<button class="w-full py-2 rounded-xl text-sm font-medium bg-gendo-accent/20 text-gendo-accent border border-gendo-accent/40 hover:bg-gendo-accent hover:text-white hover:border-gendo-accent transition-all" data-svelte-h="svelte-2td5fx">🤝 Join Meetup
							</button>`}`} </div>`;
  })}</div>`}</div></div>  ${``}`;
});
export {
  Page as default
};
