function cleanVenueName(name, cityName) {
  if (!name || typeof name !== "string") return "";
  let s = name.trim();
  if (!s) return "";
  s = s.replace(/,?\s*[A-Z]{2}\s*$/, "").trim();
  if (cityName && cityName.trim()) {
    const city = cityName.trim();
    const cityEscaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const suffixRegex = new RegExp(
      `\\s*[-–|]\\s*${cityEscaped}(?:,\\s*[A-Z]{2})?\\s*$|\\s*\\(\\s*${cityEscaped}(?:,\\s*[A-Z]{2})?\\s*\\)\\s*$`,
      "i"
    );
    s = s.replace(suffixRegex, "").trim();
  }
  s = s.replace(/\s*[-–|]\s*[^–-]+,\s*[A-Z]{2}\s*$/i, "").trim();
  if (cityName && cityName.trim()) {
    const city = cityName.trim();
    const cityLower = city.toLowerCase();
    const suffixMatch = s.match(/\s*[-–|]\s*(.+)$/);
    if (suffixMatch) {
      const afterDash = suffixMatch[1].trim().toLowerCase();
      if (afterDash === cityLower || afterDash.startsWith(cityLower + ",") || afterDash.startsWith(cityLower + " ")) {
        s = s.replace(/\s*[-–|]\s*.+$/, "").trim();
      }
    }
  }
  return s || name.trim();
}
function cleanEventTitle(title, cityName) {
  return cleanVenueName(title, cityName);
}
const US_STATE_TO_ABBREV = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
  "Puerto Rico": "PR"
};
function formatCityDisplay(city) {
  const name = (city.name ?? "").trim();
  if (!name) return "";
  const state = (city.state ?? "").trim();
  if (!state) return name;
  const cc = (city.countryCode ?? "").toUpperCase();
  if (cc === "US") {
    const abbrev = US_STATE_TO_ABBREV[state] ?? (state.length === 2 ? state : state);
    return `${name}, ${abbrev}`;
  }
  return `${name}, ${state}`;
}
function formatEventCity(ev) {
  const name = (ev.cityName ?? "").trim();
  if (!name) return "";
  const state = (ev.cityState ?? "").trim();
  if (!state) return name;
  const isUS = /^(United States|USA|US)$/i.test((ev.cityCountry ?? "").trim());
  const isUSAbbrev = state.length === 2 && /^[A-Z]{2}$/i.test(state);
  if (isUSAbbrev) return `${name}, ${state.toUpperCase()}`;
  if (isUS && US_STATE_TO_ABBREV[state]) return `${name}, ${US_STATE_TO_ABBREV[state]}`;
  return `${name}, ${state}`;
}
const CACHE_KEY = "gendo_translations";
const CACHE_MAX = 500;
let cache = /* @__PURE__ */ new Map();
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      cache = new Map(arr.slice(-CACHE_MAX));
    }
  } catch {
  }
}
function saveCache() {
  try {
    const arr = Array.from(cache.entries()).slice(-CACHE_MAX);
    localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
  } catch {
  }
}
function getUserLang() {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("es")) return "es";
  return "en";
}
async function translateBatch(texts, targetLang) {
  if (texts.length === 0) return [];
  if (typeof cache === "undefined" || cache.size === 0) loadCache();
  const results = new Array(texts.length);
  const toFetch = [];
  for (let i = 0; i < texts.length; i++) {
    const t = String(texts[i] ?? "").trim();
    if (!t) {
      results[i] = "";
      continue;
    }
    const key = `${targetLang}:${t}`;
    const cached = cache.get(key);
    if (cached !== void 0) {
      results[i] = cached;
    } else {
      toFetch.push({ i, text: t });
    }
  }
  if (toFetch.length === 0) return results;
  try {
    const fetchTexts = toFetch.map((x) => x.text);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: fetchTexts, targetLang })
    });
    const data = await res.json();
    if (!res.ok) return results;
    const translations = data.translations ?? fetchTexts;
    for (let j = 0; j < toFetch.length; j++) {
      const { i } = toFetch[j];
      const orig = fetchTexts[j];
      const trans = translations[j] ?? orig;
      results[i] = trans;
      cache.set(`${targetLang}:${orig}`, trans);
    }
    saveCache();
  } catch {
    for (const { i, text } of toFetch) results[i] = text;
  }
  return results;
}
async function translateText(text, targetLang) {
  if (!text || !text.trim()) return "";
  const [translated] = await translateBatch([text], targetLang);
  return translated || text;
}
export {
  cleanVenueName as a,
  formatCityDisplay as b,
  cleanEventTitle as c,
  translateText as d,
  formatEventCity as f,
  getUserLang as g,
  translateBatch as t
};
