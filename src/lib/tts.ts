// Text-to-speech via the Web Speech API. Prefers a Malayalam voice, falls back to en-IN.
type TtsConfig = { enabled: boolean; rate: number; lang: "ml" | "en" };
const config: TtsConfig = { enabled: true, rate: 0.9, lang: "ml" };

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function configureTts(c: Partial<TtsConfig>) { Object.assign(config, c); }

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() { if (ttsSupported) voices = window.speechSynthesis.getVoices(); }
if (ttsSupported) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }

function pickVoice(text: string): { voice?: SpeechSynthesisVoice; lang: string } {
  const hasMalayalam = /[ഀ-ൿ]/.test(text);
  const want = hasMalayalam || config.lang === "ml" ? ["ml-IN", "ml"] : ["en-IN", "en-GB", "en-US", "en"];
  for (const w of want) {
    const v = voices.find((x) => x.lang.toLowerCase().startsWith(w.toLowerCase()));
    if (v) return { voice: v, lang: v.lang };
  }
  const fallback = voices.find((x) => x.lang.toLowerCase().startsWith("en-in"));
  return { voice: fallback, lang: hasMalayalam ? "ml-IN" : "en-IN" };
}

export function hasMalayalamVoice() { return voices.some((v) => v.lang.toLowerCase().startsWith("ml")); }

/** Speak text. `force` speaks even if the user turned voice off (e.g. explicit read-aloud taps). */
export function speak(text: string, opts: { force?: boolean; interrupt?: boolean } = {}) {
  if (!ttsSupported || !text) return;
  if (!config.enabled && !opts.force) return;
  if (opts.interrupt !== false) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const { voice, lang } = pickVoice(text);
  if (voice) u.voice = voice;
  u.lang = lang;
  u.rate = config.rate;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() { if (ttsSupported) window.speechSynthesis.cancel(); }
