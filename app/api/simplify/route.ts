import { NextResponse } from "next/server";

// Server-only: GEMINI_API_KEY is never sent to the browser.
const SYSTEM_PROMPT =
  "Explain the following text in very simple Malayalam for an elderly reader, in at most 5 short sentences. " +
  "Do NOT recommend, change, or calculate any medicine dose, and do not give medical advice. " +
  "If the text contains dosage instructions, restate them exactly as written and add: " +
  "'സംശയമുണ്ടെങ്കിൽ ഡോക്ടറോടോ ഫാർമസിസ്റ്റിനോടോ ചോദിക്കൂ.' " +
  "You are not a doctor and must never present yourself as one. Output plain text only, no markdown.";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (text.length > 6000) return NextResponse.json({ error: "too_long" }, { status: 413 });

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
    if (r.status === 429) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (!r.ok) return NextResponse.json({ error: "upstream", status: r.status }, { status: 502 });
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!out) return NextResponse.json({ error: "empty_response" }, { status: 502 });
    return NextResponse.json({ text: out }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }
}
