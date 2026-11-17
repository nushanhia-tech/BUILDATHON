import type { VercelRequest, VercelResponse } from "@vercel/node";

// Server-only: GEMINI_API_KEY is never sent to the browser.
const SYSTEM_PROMPT =
  "Explain the following text in very simple Malayalam for an elderly reader, in at most 5 short sentences. " +
  "Do NOT recommend, change, or calculate any medicine dose, and do not give medical advice. " +
  "If the text contains dosage instructions, restate them exactly as written and add: " +
  "'സംശയമുണ്ടെങ്കിൽ ഡോക്ടറോടോ ഫാർമസിസ്റ്റിനോടോ ചോദിക്കൂ.' " +
  "You are not a doctor and must never present yourself as one. Output plain text only, no markdown.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "not_configured" });

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body;
  const text = String(body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 6000) return res.status(413).json({ error: "too_long" });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });
    if (r.status === 429) return res.status(429).json({ error: "rate_limited" });
    if (!r.ok) return res.status(502).json({ error: "upstream", status: r.status });
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!out) return res.status(502).json({ error: "empty_response" });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ text: out });
  } catch {
    return res.status(502).json({ error: "network" });
  }
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return null; } }
