import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

/**
 * Mic button + always-present text field fallback. Calls onSubmit with the final text.
 */
export function VoiceInput({ onSubmit, placeholder, big = false, micLabel, autoSubmit = true }: {
  onSubmit: (text: string) => void; placeholder?: string; big?: boolean; micLabel?: string; autoSubmit?: boolean;
}) {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const stt = useSpeechRecognition({
    lang: lang === "en" ? "en-IN" : "ml-IN",
    onFinal: (txt) => { if (autoSubmit) onSubmit(txt); else setText(txt); },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="flex flex-col gap-3">
      {stt.supported ? (
        <button
          type="button"
          onClick={() => (stt.listening ? stt.stop() : stt.start())}
          aria-label={micLabel ?? t("speakAsk")}
          aria-pressed={stt.listening}
          className={`w-full rounded-3xl font-bold flex items-center justify-center gap-3 ${big ? "min-h-24 text-[1.4rem]" : "min-h-16"} ${
            stt.listening ? "bg-danger text-on-danger animate-pulse" : "bg-primary text-on-primary shadow-[0_10px_24px_rgba(47,111,237,.3)]"
          }`}
        >
          {stt.listening ? `🔴 ${t("listening")}` : micLabel ?? t("speakAsk")}
        </button>
      ) : (
        <p className="text-sm text-muted bg-soft rounded-2xl p-3">{t("noStt")}</p>
      )}
      {stt.listening && stt.interim && <p className="text-xl text-muted italic" aria-live="polite">{stt.interim}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? t("typeHere")} aria-label={placeholder ?? t("typeHere")} />
        <button type="submit" className="min-h-16 min-w-16 px-4 rounded-2xl bg-soft text-primary font-bold" aria-label={t("send")}>
          ➤
        </button>
      </form>
    </div>
  );
}
