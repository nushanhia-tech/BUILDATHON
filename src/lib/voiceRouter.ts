// Keyword-based voice command router (Malayalam + English). Pure functions — no I/O.

export type Intent =
  | { kind: "open_medicines" }
  | { kind: "read_tasks" }
  | { kind: "create_task"; title: string; due: Date; whenLabel: "today" | "tomorrow" | "dayafter" }
  | { kind: "where"; query: string }
  | { kind: "save_note"; text: string }
  | { kind: "call_contact"; name: string }
  | { kind: "open_ocr" }
  | { kind: "open_wheelchair" }
  | { kind: "sos" }
  | { kind: "unknown" };

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

const SOS = ["സഹായം", "രക്ഷിക്ക", "അപകടം", "sos", "help me", "emergency"];
const WHERE = ["എവിടെ വെച്ചു", "എവിടെയാണ് വെച്ചത്", "എവിടെ വച്ചു", "എവിടെ", "where did i", "where is my", "where are my", "where"];
const PUT = ["വെച്ചു", "വച്ചു", "ഇട്ടു", "i kept", "i put", "i left", "kept", "placed"];
const CALL = ["വിളിക്കണം", "വിളിക്കൂ", "വിളിക്ക്", "വിളിക്കുക", "call", "phone"];
const TOMORROW = ["നാളെ", "tomorrow"];
const DAY_AFTER = ["മറ്റന്നാൾ", "day after tomorrow"];
const TODAY = ["ഇന്ന്", "today"];
const TASK_HINT = ["കാണണം", "പോകണം", "വാങ്ങണം", "ചെയ്യണം", "അടയ്ക്കണം", "ഓർമ്മിപ്പിക്ക", "remind", "appointment", "need to", "have to"];
const READ_TASKS = ["ജോലി", "ഇന്ന് എന്ത്", "ഇന്നത്തെ കാര്യ", "കാര്യങ്ങൾ", "എന്താണ് ചെയ്യാനുള്ളത്", "tasks", "to do", "todo", "what do i have"];
const MEDICINE = ["മരുന്ന്", "മരുന്ന", "ഗുളിക", "medicine", "tablet", "pill"];
const READ = ["വായിച്ചുതരൂ", "വായിച്ചു തരൂ", "വായിക്ക", "read"];
const WHEELCHAIR = ["വീൽചെയർ", "വീൽ ചെയർ", "wheelchair", "wheel chair"];

const STOP_WORDS = ["എന്റെ", "ഞാൻ", "എനിക്ക്", "ആണ്", "ഉണ്ട്", "my", "the", "i", "did", "is", "are", "keep", "put", "a", "an", "to"];

/** Malayalam words inflect at the end (കണ്ണട → കണ്ണടയെ, മകൻ → മകനെ): compare by a short stem. */
export function stem(word: string): string {
  const w = word.replace(/[?.,!।]/g, "").trim().toLowerCase();
  if (/^[a-z]+$/.test(w)) return w.length > 4 ? w.replace(/(es|s)$/, "") : w;
  const chars = Array.from(w);
  return chars.length > 3 ? chars.slice(0, chars.length - 1).join("") : chars.length === 3 ? chars.slice(0, 2).join("") : w;
}

export function keywords(text: string, remove: string[] = []): string[] {
  let t = text.toLowerCase();
  for (const r of remove) t = t.split(r).join(" ");
  return t
    .split(/\s+/)
    .map((w) => w.replace(/[?.,!।]/g, "").trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.includes(w));
}

/** Does `haystack` mention any keyword (by stem)? Returns a score. */
export function matchScore(haystack: string, words: string[]): number {
  const h = haystack.toLowerCase();
  return words.reduce((s, w) => (h.includes(w) ? s + 2 : h.includes(stem(w)) && stem(w).length >= 2 ? s + 1 : s), 0);
}

function parseTime(t: string): { h: number; m: number } | null {
  const num = t.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:മണി|am|pm|o'?clock|hrs)?/i);
  let h: number | null = num ? Number(num[1]) : null;
  const m = num?.[2] ? Number(num[2]) : 0;
  const evening = has(t, ["വൈകുന്നേരം", "വൈകിട്ട്", "രാത്രി", "pm", "evening", "night"]);
  const noon = has(t, ["ഉച്ച", "afternoon"]);
  const morning = has(t, ["രാവിലെ", "am", "morning"]);
  if (h == null) {
    if (morning) return { h: 9, m: 0 };
    if (noon) return { h: 13, m: 0 };
    if (has(t, ["വൈകുന്നേരം", "വൈകിട്ട്", "evening"])) return { h: 17, m: 0 };
    if (has(t, ["രാത്രി", "night"])) return { h: 20, m: 0 };
    return null;
  }
  if ((evening || (noon && h < 6)) && h < 12) h += 12;
  if (h > 23) return null;
  return { h, m };
}

const DATE_WORDS = [...TOMORROW, ...DAY_AFTER, ...TODAY, "രാവിലെ", "ഉച്ചയ്ക്ക്", "ഉച്ചക്ക്", "ഉച്ച", "വൈകുന്നേരം", "വൈകിട്ട്", "രാത്രി",
  "മണിക്ക്", "മണി", "at", "am", "pm", "morning", "evening", "night", "afternoon", "remind me", "ഓർമ്മിപ്പിക്കണം"];

function cleanTitle(text: string) {
  let t = ` ${text} `;
  for (const w of DATE_WORDS) t = t.split(new RegExp(`\\s${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s)`, "gi")).join(" ");
  t = t.replace(/\d{1,2}([:.]\d{2})?/g, " ").replace(/\s+/g, " ").trim().replace(/^to\s+/i, "");
  return t || text.trim();
}

export function parseCommand(raw: string, now = new Date()): Intent {
  const text = raw.trim();
  const t = text.toLowerCase();
  if (!t) return { kind: "unknown" };

  // SOS never sends directly — the caller must show a confirm dialog.
  if (has(t, SOS)) return { kind: "sos" };

  if (has(t, WHERE) && !has(t, ["വെച്ചു.", "i kept", "i put"])) {
    const q = keywords(t, WHERE.concat(["വെച്ചത്", "വെച്ചിരിക്കുന്നത്", "?"])).join(" ");
    if (q) return { kind: "where", query: q };
  }

  if (has(t, PUT)) return { kind: "save_note", text };

  const dated = has(t, TOMORROW) || has(t, DAY_AFTER) || (has(t, TODAY) && parseTime(t) !== null);
  if (has(t, CALL) && !dated) {
    const name = keywords(t, CALL).join(" ");
    if (name) return { kind: "call_contact", name };
  }

  if (dated || has(t, TASK_HINT)) {
    const whenLabel = has(t, DAY_AFTER) ? "dayafter" : has(t, TOMORROW) ? "tomorrow" : "today";
    const due = new Date(now);
    due.setDate(due.getDate() + (whenLabel === "dayafter" ? 2 : whenLabel === "tomorrow" ? 1 : 0));
    const tm = parseTime(t) ?? { h: whenLabel === "today" ? Math.min(now.getHours() + 1, 23) : 10, m: 0 };
    due.setHours(tm.h, tm.m, 0, 0);
    return { kind: "create_task", title: cleanTitle(text), due, whenLabel };
  }

  if (has(t, READ_TASKS)) return { kind: "read_tasks" };
  if (has(t, MEDICINE)) return { kind: "open_medicines" };
  if (has(t, READ)) return { kind: "open_ocr" };
  if (has(t, WHEELCHAIR)) return { kind: "open_wheelchair" };
  return { kind: "unknown" };
}
