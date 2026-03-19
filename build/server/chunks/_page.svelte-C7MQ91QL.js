import { c as create_ssr_component, e as escape, b as add_attribute, i as each } from './ssr-0v8FJN9_.js';
import { format } from 'date-fns';
import { g as getUserLang, d as translateText, c as cleanEventTitle, f as formatEventCity, a as cleanVenueName } from './translate-BDs1bCY5.js';

function timeAgo(ts) {
  const diff = Date.now() / 1e3 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function parseTags(tags) {
  if (!tags) return [];
  try {
    return JSON.parse(tags).slice(0, 6);
  } catch {
    return [];
  }
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const { event, related } = data;
  let comments = data.comments;
  let rsvp = data.rsvp;
  let userRsvpStatus = data.userRsvpStatus;
  let currentUser = data.currentUser;
  let newComment = "";
  let replyingTo = null;
  let replyContent = "";
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
  const travelEmoji = {
    backpacker: "🎒",
    nomad: "💻",
    solo_traveler: "🧭",
    traveler: "✈️",
    local: "📍",
    expat: "🌍"
  };
  function formatDate(ms) {
    return format(new Date(ms), "EEEE, MMMM d, yyyy 'at' h:mm a");
  }
  function goingCount() {
    return rsvp.counts.find((c) => c.status === "going")?.count ?? 0;
  }
  function interestedCount() {
    return rsvp.counts.find((c) => c.status === "interested")?.count ?? 0;
  }
  let userLang = "en";
  let translatedTitle = "";
  let translatedDesc = "";
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  {
    if (typeof window !== "undefined") userLang = getUserLang();
  }
  {
    if (event && userLang) {
      translateText(cleanEventTitle(event.title, event.cityName), userLang).then((t) => {
        translatedTitle = t;
      });
      if (event.description) translateText(event.description.slice(0, 500), userLang).then((t) => {
        translatedDesc = t;
      });
    }
  }
  return `${$$result.head += `<!-- HEAD_svelte-rnmp7f_START -->${$$result.title = `<title>${escape(event.title)} — Gendo</title>`, ""}<!-- HEAD_svelte-rnmp7f_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"> <div class="bg-gendo-surface border-b border-white/[0.06] px-4 py-3"><div class="max-w-4xl mx-auto flex items-center gap-3">${event.cityName ? `<a href="${"/city/" + escape(event.cityName.toLowerCase().replace(/\s+/g, "-"), true)}" class="text-gendo-accent hover:text-gendo-accent/80 text-sm">← ${escape(formatEventCity({
    cityName: event.cityName,
    cityState: event.state,
    cityCountry: event.country
  }))}</a>` : `<a href="/" class="text-gendo-accent hover:text-gendo-accent/80 text-sm" data-svelte-h="svelte-3h87j2">← Back</a>`}</div></div> <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8"><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8"> <div class="lg:col-span-2 space-y-6"> <div class="bg-gendo-surface rounded-2xl p-4 sm:p-6 border border-white/[0.06]"><div class="flex items-start gap-3"><span class="text-3xl sm:text-4xl flex-shrink-0">${escape(typeEmoji[event.type] ?? "📅")}</span> <div class="flex-1 min-w-0">${event.featured ? `<span class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full mb-2 inline-block" data-svelte-h="svelte-13f5ykz">⭐ Featured</span>` : ``} <h1 class="text-xl sm:text-2xl font-bold text-white break-words">${escape(translatedTitle || cleanEventTitle(event.title, event.cityName))}</h1> <p class="text-gendo-accent mt-1">${escape(formatDate(event.dateStart))}</p> ${event.venueName ? `<button class="text-gray-400 mt-1 hover:text-gendo-accent transition-colors text-left" title="Abrir en mapa">📍 ${escape(cleanVenueName(event.venueName, event.cityName))}${escape(event.venueAddress ? ` — ${event.venueAddress}` : "")}</button>` : ``}</div></div> ${event.description ? `<p class="mt-4 text-gray-300 leading-relaxed">${escape(translatedDesc || event.description)}</p>` : ``}  <div class="flex flex-wrap gap-2 sm:gap-3 mt-4 items-center"><button ${""} class="${"flex items-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 " + escape(
    "bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80 border border-white/[0.06]",
    true
  )}"${add_attribute("title", "Add to my agenda", 0)}>${escape("📌 Save")}</button> ${event.price === "free" ? `<span class="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium" data-svelte-h="svelte-1366h1x">FREE</span>` : `${event.priceAmount ? `<span class="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">$${escape(event.priceAmount)} ${escape(event.currency ?? "USD")}</span>` : `${event.price === "paid" ? `<span class="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium" data-svelte-h="svelte-sn1cc3">Paid</span>` : ``}`}`} ${event.sourceUrl ? `<a${add_attribute("href", event.sourceUrl, 0)} target="_blank" rel="noopener" class="bg-gendo-accent hover:bg-gendo-accent/90 text-white px-4 py-1.5 rounded-full text-sm transition-colors">Get Tickets / Info →</a>` : ``} ${event.venueWebsite ? `<a${add_attribute("href", event.venueWebsite, 0)} target="_blank" rel="noopener" class="text-gray-400 hover:text-white text-sm">Venue website →</a>` : ``}</div>  ${parseTags(event.tags).length > 0 ? `<div class="flex flex-wrap gap-1 mt-3">${each(parseTags(event.tags), (tag) => {
    return `<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#${escape(tag)}</span>`;
  })}</div>` : ``}</div>  <div class="bg-gendo-surface rounded-2xl p-6 border border-white/[0.06]"><h2 class="font-semibold text-white mb-4" data-svelte-h="svelte-wugrjb">Are you going?</h2> <div class="flex gap-3 mb-4"><button class="${"flex-1 py-2.5 rounded-xl font-medium text-sm transition-all " + escape(
    userRsvpStatus === "going" ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-gendo-muted text-gendo-cream/80 hover:bg-green-900/50 hover:text-green-300 border border-white/[0.06]",
    true
  )}">✅ Going (${escape(goingCount())})</button> <button class="${"flex-1 py-2.5 rounded-xl font-medium text-sm transition-all " + escape(
    userRsvpStatus === "interested" ? "bg-yellow-500 text-gendo-bg shadow-lg" : "bg-gendo-muted text-gendo-cream/80 hover:bg-yellow-900/50 hover:text-yellow-300 border border-white/[0.06]",
    true
  )}">⭐ Interested (${escape(interestedCount())})</button></div>  ${rsvp.attendees.length > 0 ? `<div><p class="text-sm text-gray-400 mb-2" data-svelte-h="svelte-8hkesl">Who&#39;s going:</p> <div class="flex flex-wrap gap-2">${each(rsvp.attendees, (att) => {
    return `<div class="flex items-center gap-1.5 bg-gendo-muted rounded-full px-3 py-1"${add_attribute("title", att.home_country ? `From ${att.home_country}` : "", 0)}>${att.avatar_url ? `<img${add_attribute("src", att.avatar_url, 0)}${add_attribute("alt", att.username, 0)} class="w-5 h-5 rounded-full">` : ``} <span class="text-xs text-white">${escape(att.display_name ?? att.username)}</span> <span class="text-xs">${escape(travelEmoji[att.travel_style] ?? "✈️")}</span> </div>`;
  })}</div></div>` : ``}</div>  <div class="bg-gendo-surface rounded-2xl p-6 border border-white/[0.06]"><h2 class="font-semibold text-white mb-4">💬 Discussion (${escape(comments.length)} ${escape(comments.length === 1 ? "comment" : "comments")})</h2>  ${currentUser ? `<div class="flex gap-3 mb-6"><img${add_attribute("src", currentUser.avatarUrl ?? `https://ui-avatars.com/api/?name=${currentUser.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", currentUser.username, 0)} class="w-9 h-9 rounded-full flex-shrink-0"> <div class="flex-1"><textarea placeholder="Share your thoughts, tips, or questions about this event..." class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" rows="3">${escape("")}</textarea> <button ${!newComment.trim() ? "disabled" : ""} class="mt-2 bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">${escape("Post Comment")}</button></div></div>` : `<button class="w-full bg-gendo-muted hover:bg-gendo-muted/80 border border-white/[0.06] border-dashed text-gendo-text-muted hover:text-white rounded-xl py-4 text-sm transition-colors mb-6" data-svelte-h="svelte-cjtadz">✈️ Join as a traveler to comment...</button>`}  ${comments.length === 0 ? `<p class="text-gray-500 text-sm text-center py-4" data-svelte-h="svelte-1n4uxqj">No comments yet. Be the first!</p>` : ``} <div class="space-y-4">${each(comments, (comment) => {
    return `<div class="flex gap-3"><img${add_attribute("src", comment.avatar_url ?? `https://ui-avatars.com/api/?name=${comment.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", comment.username, 0)} class="w-8 h-8 rounded-full flex-shrink-0 mt-1"> <div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-medium text-white text-sm">${escape(comment.display_name ?? comment.username)}</span> <span class="text-xs text-gray-500">${escape(travelEmoji[comment.travel_style] ?? "✈️")}</span> <span class="text-xs text-gray-500">${escape(timeAgo(comment.created_at))}</span></div> <p class="text-gray-300 text-sm mt-1 leading-relaxed">${escape(comment.content)}</p> <div class="flex gap-3 mt-1"><button class="${"text-xs " + escape(
      comment.user_liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400",
      true
    ) + " transition-colors"}">♥ ${escape(comment.likes > 0 ? comment.likes : "")}</button> ${currentUser ? `<button class="text-xs text-gendo-text-muted hover:text-gendo-accent transition-colors" data-svelte-h="svelte-1seenlz">Reply
											</button>` : ``}</div>  ${replyingTo === comment.id ? `<div class="mt-3 flex gap-2"><textarea placeholder="Write a reply..." class="flex-1 bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" rows="2">${escape("")}</textarea> <div class="flex flex-col gap-1"><button ${!replyContent.trim() ? "disabled" : ""} class="bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs">Reply</button> <button class="text-gray-500 hover:text-white text-xs px-3 py-1.5" data-svelte-h="svelte-11lc44v">Cancel</button></div> </div>` : ``}  ${comment.replies && comment.replies.length > 0 ? `<div class="mt-3 pl-4 border-l border-white/[0.06] space-y-3">${each(comment.replies, (reply) => {
      return `<div class="flex gap-2"><img${add_attribute("src", reply.avatar_url ?? `https://ui-avatars.com/api/?name=${reply.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", reply.username, 0)} class="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"> <div><div class="flex items-center gap-2"><span class="font-medium text-white text-xs">${escape(reply.display_name ?? reply.username)}</span> <span class="text-xs text-gray-500">${escape(travelEmoji[reply.travel_style] ?? "✈️")}</span> <span class="text-xs text-gray-500">${escape(timeAgo(reply.created_at))}</span></div> <p class="text-gray-300 text-sm leading-relaxed">${escape(reply.content)}</p> <button class="${"text-xs " + escape(
        reply.user_liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400",
        true
      ) + " mt-0.5 transition-colors"}">♥ ${escape(reply.likes > 0 ? reply.likes : "")} </button></div> </div>`;
    })} </div>` : ``}</div> </div>`;
  })}</div></div></div>  <div class="space-y-4"> ${event.venueName ? `<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]"><h3 class="font-semibold text-white mb-2 text-sm" data-svelte-h="svelte-17fgf4s">📍 Venue</h3> <button class="text-white font-medium hover:text-gendo-accent transition-colors text-left block" title="Abrir en mapa">${escape(cleanVenueName(event.venueName, event.cityName))}</button> ${event.venueAddress ? `<button class="text-gray-400 text-xs mt-0.5 hover:text-gendo-accent transition-colors text-left block" title="Abrir en mapa">${escape(event.venueAddress)}</button>` : ``} ${event.venueDesc ? `<p class="text-gray-400 text-xs mt-2">${escape(event.venueDesc)}</p>` : ``} <div class="flex flex-wrap gap-3 mt-2"><button class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gendo-accent hover:bg-gendo-accent/90 text-white text-sm font-medium transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
								Cómo llegar</button> ${event.venueWebsite ? `<a${add_attribute("href", event.venueWebsite, 0)} target="_blank" rel="noopener" class="text-xs text-gendo-accent hover:text-gendo-accent/80 py-2">Website →</a>` : ``} ${event.venueInstagram ? `<a href="${"https://instagram.com/" + escape(event.venueInstagram, true)}" target="_blank" rel="noopener" class="text-xs text-pink-400 hover:text-pink-300 py-2">@${escape(event.venueInstagram)}</a>` : ``}</div></div>` : ``}  ${!currentUser ? `<div class="bg-gradient-to-br from-gendo-surface to-gendo-muted rounded-xl p-4 border border-gendo-accent/30"><h3 class="font-semibold text-white mb-1" data-svelte-h="svelte-dijl7n">✈️ Join as a Traveler</h3> <p class="text-gendo-cream/80 text-xs mb-3" data-svelte-h="svelte-9p981q">Say you&#39;re going, leave a comment, meet other travelers.</p> <button class="w-full bg-gendo-accent text-white font-semibold py-2 rounded-lg text-sm hover:bg-gendo-accent/90 transition-colors" data-svelte-h="svelte-19u8mc6">Create Free Profile</button></div>` : `<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06] flex items-center gap-3"><img${add_attribute("src", currentUser.avatarUrl ?? `https://ui-avatars.com/api/?name=${currentUser.username}&background=random&color=fff&size=64`, 0)}${add_attribute("alt", currentUser.username, 0)} class="w-10 h-10 rounded-full"> <div><p class="text-white font-medium text-sm">${escape(currentUser.displayName ?? currentUser.username)}</p> <p class="text-gray-400 text-xs">${escape(travelEmoji[currentUser.travelStyle] ?? "✈️")} ${escape(currentUser.travelStyle)}</p></div></div>`}  ${related.length > 0 ? `<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]"><h3 class="font-semibold text-white mb-3 text-sm" data-svelte-h="svelte-bjm26i">More like this</h3> <div class="space-y-2">${each(related, (rel) => {
    return `<a href="${"/event/" + escape(rel.id, true)}" class="block hover:bg-gendo-muted rounded-lg p-2 -mx-2 transition-colors"><p class="text-white text-sm font-medium line-clamp-1">${escape(cleanEventTitle(rel.title, event.cityName))}</p> <p class="text-gray-400 text-xs mt-0.5">${escape(format(new Date(rel.dateStart), "MMM d"))} ${rel.venueName ? `· ${escape(cleanVenueName(rel.venueName, event.cityName).slice(0, 25))}` : ``}</p> </a>`;
  })}</div></div>` : ``}  <div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]"><h3 class="font-semibold text-white mb-1 text-sm" data-svelte-h="svelte-ydnctb">🤝 Traveler Meetups</h3> <p class="text-gray-400 text-xs mb-3">Meet other travelers in ${escape(formatEventCity({
    cityName: event.cityName,
    cityState: event.state,
    cityCountry: event.country
  }) || "this city")}. Post your own meetup or join one.</p> ${event.cityName ? `<a href="${"/meetups?city=" + escape(encodeURIComponent(event.cityName ?? ""), true)}" class="block text-center bg-gendo-accent/20 hover:bg-gendo-accent/30 text-gendo-accent py-2 rounded-lg text-xs transition-colors">See Meetups in ${escape(formatEventCity({
    cityName: event.cityName,
    cityState: event.state,
    cityCountry: event.country
  }))} →</a>` : ``}</div></div></div></div></div>  ${``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-C7MQ91QL.js.map
