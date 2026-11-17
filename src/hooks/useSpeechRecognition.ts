import { useCallback, useEffect, useRef, useState } from "react";
import { getRecognitionCtor, type SpeechRecognitionLike } from "../lib/stt";

interface Opts { lang?: string; continuous?: boolean; onFinal?: (text: string) => void; }

/**
 * Web Speech recognition with feature detection.
 * continuous=true keeps listening and auto-restarts when the browser ends the session.
 */
export function useSpeechRecognition({ lang = "ml-IN", continuous = false, onFinal }: Opts = {}) {
  const Ctor = getRecognitionCtor();
  const supported = Boolean(Ctor);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback((langOverride?: string) => {
    if (!Ctor) return;
    try { recRef.current?.abort(); } catch { /* ignore */ }
    const rec = new Ctor();
    rec.lang = langOverride || lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => { setListening(true); setError(null); };
    rec.onresult = (e) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript as string;
        if (r.isFinal) {
          setFinalText((prev) => (continuous ? `${prev} ${txt}`.trim() : txt));
          onFinalRef.current?.(txt.trim());
        } else inter += txt;
      }
      setInterim(inter);
    };
    rec.onerror = (e) => {
      const code = e?.error as string;
      if (code === "not-allowed" || code === "service-not-allowed") { wantRef.current = false; setError(code); }
      else if (code !== "no-speech" && code !== "aborted") setError(code);
    };
    rec.onend = () => {
      if (wantRef.current && continuous) {
        try { rec.start(); return; } catch { /* fall through */ }
      }
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); } catch (err) { setError(String(err)); }
  }, [Ctor, lang, continuous]);

  useEffect(() => () => { wantRef.current = false; try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  const reset = useCallback(() => { setFinalText(""); setInterim(""); }, []);
  return { supported, listening, interim, finalText, error, start, stop, reset };
}
