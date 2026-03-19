import { json } from "@sveltejs/kit";
import Database from "better-sqlite3";
const CEDAR_RAPIDS_LAT = 41.9779;
const CEDAR_RAPIDS_LNG = -91.6656;
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${CEDAR_RAPIDS_LAT}&longitude=${CEDAR_RAPIDS_LNG}&current=weather_code,precipitation,temperature_2m&timezone=America%2FChicago`;
let weatherCache = null;
const CACHE_TTL = 30 * 60 * 1e3;
function classifyWeather(code, precip) {
  if (code >= 95) return "stormy";
  if (code >= 61 && code <= 67 || code >= 80 && code <= 82 || precip > 0.3)
    return "rainy";
  if (code >= 51 && code <= 55) return "rainy";
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86)
    return "snowy";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 2) return "cloudy";
  return "sunny";
}
function weatherEmoji(condition) {
  return { sunny: "☀️", cloudy: "⛅", foggy: "🌫️", rainy: "🌧️", snowy: "❄️", stormy: "⛈️" }[condition];
}
function weatherDescription(condition, tempC) {
  const t = Math.round(tempC);
  return {
    sunny: `Despejado · ${t}°C`,
    cloudy: `Nublado · ${t}°C`,
    foggy: `Neblina · ${t}°C`,
    rainy: `Lluvia · ${t}°C`,
    snowy: `Nieve · ${t}°C`,
    stormy: `Tormenta · ${t}°C`
  }[condition];
}
async function fetchWeather() {
  if (weatherCache && Date.now() - weatherCache.at < CACHE_TTL) {
    return weatherCache.info;
  }
  try {
    const res = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(4e3) });
    if (!res.ok) return null;
    const d = await res.json();
    const code = d.current.weather_code ?? 0;
    const precip = d.current.precipitation ?? 0;
    const tempC = d.current.temperature_2m ?? 20;
    const condition = classifyWeather(code, precip);
    const info = {
      code,
      precip,
      tempC: Math.round(tempC),
      condition,
      emoji: weatherEmoji(condition),
      description: weatherDescription(condition, tempC)
    };
    weatherCache = { info, at: Date.now() };
    return info;
  } catch {
    return null;
  }
}
const DB_PATH = process.env.DATABASE_URL ?? "./gendo.db";
function getTimeSlot(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
const PERSONA_CATS = {
  naturaleza: ["pesca", "ciclismo", "sports"],
  noche: ["social", "live_music", "comedy"],
  cultura: ["art", "food", "theater", "cinema", "festival", "cultura", "gastronomia"],
  zen: ["yoga", "art", "cinema"],
  neutral: []
};
function detectPersona(prefMap) {
  const totals = { naturaleza: 0, noche: 0, cultura: 0, zen: 0, neutral: 0 };
  for (const [persona, cats] of Object.entries(PERSONA_CATS)) {
    totals[persona] = cats.reduce((sum, cat) => sum + (prefMap.get(cat) ?? 0), 0);
  }
  const best = Object.entries(totals).filter(([p]) => p !== "neutral").sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 8 ? best[0] : "neutral";
}
const PERSONA_EMOJI = {
  naturaleza: "🌲",
  noche: "🌙",
  cultura: "🏛️",
  zen: "🧘",
  neutral: "✨"
};
const MESSAGES = {
  morning: {
    naturaleza: {
      sub: "Es una mañana perfecta para salir a pescar o andar en bici.",
      cta: "¿Qué hay cerca?",
      ctaPath: "/"
    },
    zen: {
      sub: "Mañana ideal para empezar con yoga. Hay clases esta mañana en Cedar Rapids.",
      cta: "Ver clases",
      ctaPath: "/"
    },
    cultura: {
      sub: "Los mercados matutinos ya están abiertos. ¿Pasamos antes de que acabe la mañana?",
      cta: "¿Vamos?",
      ctaPath: "/"
    },
    noche: {
      sub: "Ya estás pensando en la noche, ¿verdad? Mira lo que hay esta semana.",
      cta: "Ver eventos nocturnos",
      ctaPath: "/"
    },
    neutral: {
      sub: "Buenos días. ¿Qué aventura te espera hoy en Cedar Rapids?",
      cta: "Explorar eventos",
      ctaPath: "/"
    }
  },
  afternoon: {
    naturaleza: {
      sub: "Tarde perfecta para salir al aire libre. ¿Una ruta en bici o al lago?",
      cta: "Ver opciones",
      ctaPath: "/"
    },
    zen: {
      sub: "¿Desconectamos un rato? Hay clases de yoga esta tarde.",
      cta: "Ver clases",
      ctaPath: "/"
    },
    cultura: {
      sub: "Esta tarde hay eventos culturales y gastronómicos. ¿Exploramos juntos?",
      cta: "Ver eventos",
      ctaPath: "/"
    },
    noche: {
      sub: "La tarde ya está aquí. Empieza a preparar la noche: hay shows increíbles.",
      cta: "Ver la noche",
      ctaPath: "/"
    },
    neutral: {
      sub: "Hay eventos interesantes esta tarde en Cedar Rapids. ¿Te apuntas?",
      cta: "Explorar",
      ctaPath: "/"
    }
  },
  evening: {
    naturaleza: {
      sub: "Última luz del día. ¿Un paseo al aire libre antes de que oscurezca?",
      cta: "Ver salidas",
      ctaPath: "/"
    },
    zen: {
      sub: "Perfecta hora para relajarse. ¿Qué hay de yoga nocturno o meditación?",
      cta: "Ver opciones zen",
      ctaPath: "/"
    },
    cultura: {
      sub: "Tarde-noche ideal para un espectáculo o una buena cena. ¿Vamos?",
      cta: "¿Qué hay esta noche?",
      ctaPath: "/"
    },
    noche: {
      sub: "¡La tarde-noche arranca! Shows, música en vivo y más te esperan.",
      cta: "Ver la noche",
      ctaPath: "/"
    },
    neutral: {
      sub: "¿Buscamos algo para hacer esta tarde-noche en Cedar Rapids?",
      cta: "Explorar eventos",
      ctaPath: "/"
    }
  },
  night: {
    naturaleza: {
      sub: "Noche tranquila. ¿Estrellas y brisa, o ya planeando el amanecer de mañana?",
      cta: "Ver para mañana",
      ctaPath: "/"
    },
    zen: {
      sub: "Noche perfecta para desconectar. ¿Meditación, una película o simplemente respirar?",
      cta: "Ver opciones",
      ctaPath: "/"
    },
    cultura: {
      sub: "Teatros y salas de concierto siguen abiertos. Todavía hay tiempo.",
      cta: "¿Qué queda esta noche?",
      ctaPath: "/"
    },
    noche: {
      sub: "La noche apenas empieza. Hay música en vivo y bares en acción ahora mismo.",
      cta: "Ver vida nocturna",
      ctaPath: "/"
    },
    neutral: {
      sub: "¿Qué te llama esta noche en Cedar Rapids?",
      cta: "Explorar",
      ctaPath: "/"
    }
  }
};
const RAIN_MESSAGES = {
  naturaleza: {
    rainy: {
      sub: "Parece que va a llover{name}. ¿Qué tal si hoy cambiamos la pesca por una visita al museo o a una cafetería acogedora?",
      cta: "Ver planes bajo techo",
      ctaPath: "/"
    },
    snowy: {
      sub: "Hay nieve en Cedar Rapids{name}. Mejor posponemos el ciclismo y exploramos algo bajo techo, ¿no?",
      cta: "Ver opciones interiores",
      ctaPath: "/"
    },
    stormy: {
      sub: "Hay tormenta{name}. Perfecto para un teatro, un cine o una buena taza de café. ¿Buscamos?",
      cta: "Ver refugios culturales",
      ctaPath: "/"
    }
  },
  zen: {
    rainy: {
      sub: "Lluvia perfecta para una sesión de yoga o meditación en interiores{name}. El sonido de la lluvia lo hace aún mejor.",
      cta: "Ver clases de yoga",
      ctaPath: "/"
    },
    snowy: {
      sub: "Nieve afuera, calma adentro{name}. Sesión de meditación o yoga esta mañana, ¿te apuntas?",
      cta: "Ver opciones zen",
      ctaPath: "/"
    },
    stormy: {
      sub: "Tormenta afuera, paz adentro{name}. Yoga o meditación — exactamente lo que necesitas ahora.",
      cta: "Ver clases",
      ctaPath: "/"
    }
  },
  cultura: {
    rainy: {
      sub: "Día lluvioso{name}: el mejor momento para museos, teatros y cafeterías con encanto. ¿Vemos qué hay?",
      cta: "¿Qué hay bajo techo?",
      ctaPath: "/"
    },
    snowy: {
      sub: "Cedar Rapids amanece con nieve{name}. Una excusa perfecta para los museos y las galerías de hoy.",
      cta: "Ver cultura de hoy",
      ctaPath: "/"
    },
    stormy: {
      sub: "Tormenta en la ciudad{name}. Los teatros y cines siguen abiertos — ¿entramos?",
      cta: "Ver eventos cubiertos",
      ctaPath: "/"
    }
  },
  noche: {
    rainy: {
      sub: "Lluvia de fondo{name}... la mejor atmósfera para una noche de shows y bares. ¡Vámonos!",
      cta: "Ver vida nocturna",
      ctaPath: "/"
    },
    snowy: {
      sub: "Nieve y noche{name}: combinación perfecta para un bar con chimenea o un show en vivo.",
      cta: "Ver la noche",
      ctaPath: "/"
    },
    stormy: {
      sub: "Tormenta épica{name}. La ciudad de noche sigue viva — ¿dónde nos metemos?",
      cta: "Ver la noche",
      ctaPath: "/"
    }
  },
  neutral: {
    rainy: {
      sub: "Parece que llueve hoy{name}. ¿Qué tal explorar cafeterías, museos o cines en Cedar Rapids?",
      cta: "Ver opciones bajo techo",
      ctaPath: "/"
    },
    snowy: {
      sub: "Nieve en Cedar Rapids{name}. Perfecto para quedarse en un lugar cálido y acogedor. ¿Buscamos?",
      cta: "Ver planes de interior",
      ctaPath: "/"
    },
    stormy: {
      sub: "Hay tormenta{name}. Mejor buscar algo bajo techo — ¿qué hay disponible hoy?",
      cta: "Explorar opciones",
      ctaPath: "/"
    }
  }
};
function injectName(template, name) {
  if (!name) return template.replace("{name}", "");
  return template.replace("{name}", `, ${name}`);
}
const SATURDAY_OVERRIDE = {
  naturaleza: {
    sub: "Es sábado y el Farmers Market está abierto. ¿Pasamos antes del ciclismo?",
    cta: "Ver el mercado",
    ctaPath: "/"
  },
  cultura: {
    sub: "¡Sábado de mercado! El NewBo City Market y otros están abiertos hoy.",
    cta: "¿Vamos al mercado?",
    ctaPath: "/"
  },
  gastronomia: {
    sub: "¡Sábado de mercado! Hay productos frescos y puestos de comida abiertos ahora.",
    cta: "¿Vamos al mercado?",
    ctaPath: "/"
  },
  zen: {
    sub: "Sábado perfecto: yoga por la mañana y mercado artesanal después. ¿Te apuntas?",
    cta: "Ver el plan del día",
    ctaPath: "/"
  },
  noche: {
    sub: "¡Sábado! Empieza con el mercado y termina con la mejor noche de la semana.",
    cta: "Ver el plan del día",
    ctaPath: "/"
  },
  neutral: {
    sub: "¡Hoy es sábado! Hay un mercado local abierto cerca de ti. ¿Vamos?",
    cta: "¿Vamos al mercado?",
    ctaPath: "/"
  }
};
const GET = async ({ cookies }) => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getHours();
    const dow = now.getDay();
    const timeSlot = getTimeSlot(hour);
    const isSaturday = dow === 6;
    let displayName = null;
    let avatarUrl = null;
    let isLoggedIn = false;
    const sessionToken = cookies.get("gendo_session");
    if (sessionToken) {
      const user = db.prepare(`
				SELECT display_name, username, avatar_url
				FROM users WHERE session_token = ?
			`).get(sessionToken);
      if (user) {
        displayName = user.display_name || user.username;
        avatarUrl = user.avatar_url;
        isLoggedIn = true;
      }
    }
    const sessionId = cookies.get("gendo_anon") ?? "";
    const prefMap = /* @__PURE__ */ new Map();
    if (sessionId) {
      const prefs = db.prepare(`
				SELECT category, click_count FROM user_preferences
				WHERE session_id = ? ORDER BY click_count DESC
			`).all(sessionId);
      for (const p of prefs) prefMap.set(p.category, p.click_count);
    }
    const persona = detectPersona(prefMap);
    const hasPrefs = prefMap.size > 0;
    const weather = await fetchWeather();
    const isBadWeather = weather ? ["rainy", "snowy", "stormy"].includes(weather.condition) : false;
    let msgDef;
    let weatherOverride = false;
    if (isBadWeather && hasPrefs && weather) {
      const weatherKey = weather.condition;
      const rawDef = RAIN_MESSAGES[persona][weatherKey];
      msgDef = {
        ...rawDef,
        sub: injectName(rawDef.sub, displayName)
      };
      weatherOverride = true;
    } else if (isSaturday && timeSlot === "morning" && SATURDAY_OVERRIDE[persona]) {
      msgDef = SATURDAY_OVERRIDE[persona];
    } else if (isSaturday && !hasPrefs) {
      msgDef = SATURDAY_OVERRIDE["neutral"];
    } else {
      msgDef = MESSAGES[timeSlot][persona];
    }
    const greeting = displayName ? `¡Hola ${displayName}! Qué bueno verte de nuevo.` : "¡Hola! Qué bueno verte de nuevo.";
    const sub = hasPrefs || weatherOverride ? msgDef.sub : displayName ? `Estamos personalizando tu experiencia. ¿Empezamos a explorar Cedar Rapids?` : `Descubre qué está pasando cerca de ti ahora mismo.`;
    return json({
      greeting,
      sub,
      cta: msgDef.cta,
      ctaPath: msgDef.ctaPath,
      persona,
      personaEmoji: PERSONA_EMOJI[persona],
      avatarUrl,
      isLoggedIn,
      hasPreferences: hasPrefs,
      timeSlot,
      // Clima — usado por el componente para mostrar el indicador visual
      weather: weather ? {
        condition: weather.condition,
        emoji: weather.emoji,
        description: weather.description,
        isBad: isBadWeather
      } : null,
      weatherOverride
    });
  } finally {
    db.close();
  }
};
export {
  GET
};
