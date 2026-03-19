import { c as create_ssr_component, d as add_attribute, e as escape, i as each } from "../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const EVENT_TYPES = [
    {
      id: "live_music",
      label: "🎵 Live Music"
    },
    {
      id: "theater",
      label: "🎭 Theater"
    },
    {
      id: "sports",
      label: "🏟️ Sports"
    },
    { id: "comedy", label: "😂 Comedy" },
    {
      id: "festival",
      label: "🎪 Festival"
    },
    {
      id: "food",
      label: "🍽️ Food & Drink"
    },
    { id: "art", label: "🎨 Art" },
    { id: "cinema", label: "🎬 Cinema" },
    { id: "other", label: "📅 Other" }
  ];
  let title = "";
  let dateStart = "";
  let dateEnd = "";
  let venueName = "";
  let venueAddress = "";
  let sourceUrl = "";
  let submitterEmail = "";
  let submitterName = "";
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `${$$result.head += `<!-- HEAD_svelte-1vs9rh7_START -->${$$result.title = `<title>Submit Event | Gendo</title>`, ""}<!-- HEAD_svelte-1vs9rh7_END -->`, ""} <div class="min-h-screen bg-gendo-bg text-white"><div class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12"><a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block" data-svelte-h="svelte-qmacs1">← Gendo</a> <h1 class="text-3xl font-bold mb-2" data-svelte-h="svelte-u1auly">➕ Submit Event</h1> <p class="text-gray-400 mb-8" data-svelte-h="svelte-u8t13b">Share an event with the community. We&#39;ll review it before publishing.</p> ${``} ${``} <form class="space-y-5"><div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-1fs81wn">Event title *</label> <input type="text" required placeholder="St. Patrick's Day at Big Grove" class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", title, 0)}></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-1tveq8d">Description</label> <textarea rows="3" placeholder="Brief description..." class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent resize-none">${escape("")}</textarea></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-smtg99">Start date *</label> <input type="datetime-local" class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", dateStart, 0)}></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-1e03mxo">End date</label> <input type="datetime-local" class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", dateEnd, 0)}></div></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-uxmbdu">City *</label> <select required class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"><option value="" data-svelte-h="svelte-1fdn19r">Select city...</option>${each(data.cities, (city) => {
    return `<option${add_attribute("value", city.id, 0)}>${escape(city.name)}${escape(city.state ? `, ${city.state}` : "")} — ${escape(city.country)}</option>`;
  })}</select></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-fi7to0">Venue / Place</label> <input type="text" placeholder="Big Grove Brewery" class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", venueName, 0)}></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-vdt2hj">Address</label> <input type="text" placeholder="123 Main St, Cedar Rapids" class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", venueAddress, 0)}></div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-kjja0z">Type</label> <select class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent">${each(EVENT_TYPES, (t) => {
    return `<option${add_attribute("value", t.id, 0)}>${escape(t.label)}</option>`;
  })}</select></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-130oqw">Price</label> <select class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"><option value="free" data-svelte-h="svelte-88bi0a">Free</option><option value="paid" data-svelte-h="svelte-1ezzwbm">Paid</option></select></div> ${``}</div> <div><label class="block text-sm font-medium text-gray-300 mb-1" data-svelte-h="svelte-1s9ix5w">Event URL</label> <input type="url" placeholder="https://..." class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", sourceUrl, 0)}></div> <div class="border-t border-white/[0.06] pt-5"><p class="text-sm text-gray-500 mb-3" data-svelte-h="svelte-1dq5fwh">Your contact (optional — for follow-up)</p> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><input type="text" placeholder="Your name" class="bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", submitterName, 0)}> <input type="email" placeholder="your@email.com" class="bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent"${add_attribute("value", submitterEmail, 0)}></div></div> <button type="submit" ${""} class="w-full bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">${escape("Submit Event")}</button></form></div></div>`;
});
export {
  Page as default
};
