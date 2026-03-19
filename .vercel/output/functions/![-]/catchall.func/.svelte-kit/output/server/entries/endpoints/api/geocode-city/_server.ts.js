import { json } from "@sveltejs/kit";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PLACE_LABEL = {
  // Núcleos urbanos
  city: "Ciudad",
  town: "Pueblo",
  village: "Aldea",
  hamlet: "Caserío",
  suburb: "Barrio",
  quarter: "Barrio",
  neighbourhood: "Colonia",
  isolated_dwelling: "Localidad",
  // Divisiones administrativas
  municipality: "Municipio",
  county: "Condado / Departamento",
  district: "Distrito",
  province: "Provincia",
  state: "Estado / Provincia",
  region: "Región",
  state_district: "Distrito",
  administrative: "Área administrativa",
  // Otros
  island: "Isla",
  archipelago: "Archipiélago",
  locality: "Localidad",
  postcode: "Código postal",
  country: "País",
  boundary: "País / Región"
};
const PLACE_EMOJI = {
  city: "🏙️",
  town: "🏘️",
  village: "🏡",
  hamlet: "🌾",
  suburb: "🏙️",
  quarter: "🏙️",
  neighbourhood: "🏘️",
  municipality: "🏛️",
  county: "📍",
  district: "📍",
  province: "🗺️",
  state: "🗺️",
  region: "🗺️",
  administrative: "📍",
  island: "🏝️",
  locality: "📍",
  country: "🌍",
  boundary: "🌍"
};
const TYPE_PRIORITY = {
  city: 1,
  town: 2,
  village: 3,
  municipality: 3,
  suburb: 4,
  quarter: 4,
  neighbourhood: 4,
  hamlet: 5,
  district: 6,
  county: 7,
  province: 7,
  state: 8,
  region: 9,
  administrative: 10,
  island: 3,
  country: 8,
  boundary: 8
};
function extractName(item, fallback) {
  const a = item.address ?? {};
  if (item.type === "country" || item.type === "boundary") {
    return a.country ?? item.display_name.split(",")[0].trim() ?? fallback;
  }
  return a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? a.quarter ?? a.neighbourhood ?? a.municipality ?? a.county ?? a.state_district ?? a.state ?? a.province ?? a.region ?? a.country ?? item.display_name.split(",")[0].trim() ?? fallback;
}
function extractState(item) {
  const a = item.address ?? {};
  return a.state ?? a.province ?? a.region ?? a.state_district ?? null;
}
const GET = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return json({ error: "Parámetro q requerido" }, { status: 400 });
  try {
    const res = await fetch(
      `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1&extratags=0`,
      { headers: { "User-Agent": "Gendo-App/1.0 (contact@gendo.app)" } }
    );
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const items = await res.json();
    const all = items.map((i) => ({
      lat: parseFloat(i.lat),
      lng: parseFloat(i.lon),
      displayName: i.display_name,
      name: extractName(i, q),
      state: extractState(i),
      country: i.address?.country ?? "",
      countryCode: (i.address?.country_code ?? "XX").toUpperCase(),
      placeType: i.type,
      placeClass: i.class,
      placeLabel: PLACE_LABEL[i.type] ?? PLACE_LABEL[i.class] ?? "Lugar",
      placeEmoji: PLACE_EMOJI[i.type] ?? PLACE_EMOJI[i.class] ?? "📍",
      priority: TYPE_PRIORITY[i.type] ?? 11,
      importance: i.importance ?? 0
    }));
    all.sort((a, b) => a.priority - b.priority || b.importance - a.importance);
    const seen = /* @__PURE__ */ new Set();
    const unique = all.filter((r) => {
      const k = `${r.name}|${r.countryCode}|${r.placeType}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return json({ results: unique.slice(0, 7) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[geocode-city]", msg);
    return json({ error: msg, results: [] }, { status: 500 });
  }
};
export {
  GET
};
