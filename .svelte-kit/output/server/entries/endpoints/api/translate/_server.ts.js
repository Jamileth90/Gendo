import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { b as private_env } from "../../../../chunks/shared-server.js";
const openai = private_env.OPENAI_API_KEY ? new OpenAI({ apiKey: private_env.OPENAI_API_KEY }) : null;
const POST = async ({ request }) => {
  if (!openai) {
    return json({ error: "OPENAI_API_KEY no configurado", translations: [] }, { status: 503 });
  }
  try {
    const body = await request.json();
    const texts = Array.isArray(body.texts) ? body.texts.filter((t) => typeof t === "string" && t.trim()) : [];
    const targetLang = body.targetLang === "es" ? "Spanish" : "English";
    if (texts.length === 0) return json({ translations: [] });
    if (texts.length > 20) return json({ error: "Máximo 20 textos por petición", translations: [] }, { status: 400 });
    const prompt = `Traduce cada línea al ${targetLang}. Responde EXACTAMENTE con una línea por traducción, en el mismo orden. Sin numeración. Si ya está en ${targetLang}, devuélvelo igual.

${texts.map((t) => String(t).slice(0, 300)).join("\n")}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1e3
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    const lines = content.split("\n").map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
    const translations = texts.map((t, i) => lines[i] ?? String(t));
    return json({ translations });
  } catch (err) {
    console.error("[translate]", err);
    return json(
      { error: err instanceof Error ? err.message : "Error de traducción", translations: [] },
      { status: 500 }
    );
  }
};
export {
  POST
};
