export const pad = (n: number) => String(n).padStart(2, "0");
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
/** "08:00" on the given day → Date */
export function atTime(hhmm: string, day = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day); d.setHours(h, m || 0, 0, 0); return d;
}
export function slotOf(hhmm: string): "morning" | "afternoon" | "night" {
  const h = Number(hhmm.split(":")[0]);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "night";
}
export function fmtTime(d: string | Date, lang: "ml" | "en") {
  return new Date(d).toLocaleTimeString(lang === "ml" ? "ml-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
}
export function fmtDate(d: string | Date, lang: "ml" | "en") {
  return new Date(d).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtDateTime(d: string | Date, lang: "ml" | "en") { return `${fmtDate(d, lang)}, ${fmtTime(d, lang)}`; }
export function hhmm12(hhmm: string, lang: "ml" | "en") { return fmtTime(atTime(hhmm), lang); }
