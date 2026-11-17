import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { useI18n, pickLabel } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { speak } from "../../../lib/tts";
import { useSpeechRecognition } from "../../../hooks/useSpeechRecognition";
import { BigButton } from "../../../components/ui/BigButton";
import { Section, Tabs } from "../../../components/ui/Bits";
import type { QuickPhrase } from "../../../lib/types";

type Mode = "listen" | "speak";

export function TalkBridge() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("listen");
  const [sttLang, setSttLang] = useState<"ml-IN" | "en-IN">(lang === "en" ? "en-IN" : "ml-IN");
  const [lines, setLines] = useState<{ who: "them" | "me"; text: string; at: Date }[]>([]);
  const [typed, setTyped] = useState("");
  const [board, setBoard] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<QuickPhrase[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const stt = useSpeechRecognition({
    lang: sttLang, continuous: true,
    onFinal: (txt) => { if (txt) setLines((l) => [...l, { who: "them", text: txt, at: new Date() }]); },
  });

  useEffect(() => {
    void supabase.from("quick_phrases").select("*").or(`user_id.is.null,user_id.eq.${profile!.id}`).order("created_at")
      .then(({ data }) => setPhrases((data ?? []) as QuickPhrase[]));
  }, [profile]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [lines, stt.interim]);

  const say = (text: string) => {
    if (!text.trim()) return;
    stt.stop();
    speak(text, { force: true });
    setLines((l) => [...l, { who: "me", text, at: new Date() }]);
  };
  const switchLang = (l: "ml-IN" | "en-IN") => { setSttLang(l); if (stt.listening) { stt.stop(); setTimeout(() => stt.start(l), 300); } };
  const saveTranscript = () => {
    const body = lines.map((l) => `[${l.at.toLocaleTimeString()}] ${l.who === "me" ? "ഞാൻ" : "അവർ"}: ${l.text}`).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `nila-conversation-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={[{ key: "listen" as Mode, label: t("listenMode") }, { key: "speak" as Mode, label: t("speakMode") }]} value={mode} onChange={setMode} />

      {/* Captions */}
      <div className="card p-4 min-h-[40vh] max-h-[55vh] overflow-y-auto flex flex-col gap-3" aria-live="polite" aria-label={t("captionsHere")}>
        {lines.length === 0 && !stt.interim && <p className="text-muted text-xl">{t("captionsHere")}</p>}
        {lines.map((l, i) => (
          <p key={i} className={`text-[1.6rem] leading-snug font-bold ${l.who === "me" ? "text-primary text-right" : ""}`}>{l.text}</p>
        ))}
        {stt.interim && <p className="text-[1.6rem] leading-snug text-muted italic">{stt.interim}</p>}
        <div ref={endRef} />
      </div>

      {mode === "listen" ? (
        <div className="flex flex-col gap-3">
          {!stt.supported && <p className="card p-3 text-warn">{t("noStt")}</p>}
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant={sttLang === "ml-IN" ? "primary" : "surface"} label={t("langMl")} onClick={() => switchLang("ml-IN")} pressed={sttLang === "ml-IN"} />
            <BigButton variant={sttLang === "en-IN" ? "primary" : "surface"} label={t("langEn")} onClick={() => switchLang("en-IN")} pressed={sttLang === "en-IN"} />
          </div>
          {stt.supported && (stt.listening
            ? <BigButton variant="danger" label={t("stopListening")} className="min-h-14 text-[1.05rem]" onClick={stt.stop} />
            : <BigButton label={t("startListening")} className="min-h-14 text-[1.05rem]" onClick={() => stt.start()} />)}
          {stt.error && <p className="text-danger">{t("micError")} ({stt.error})</p>}
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); say(typed); }}>
          <textarea rows={3} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("typeToSpeak")} aria-label={t("typeToSpeak")} className="text-[1.5rem]" />
          <div className="grid grid-cols-2 gap-2">
            <BigButton type="submit" label={t("speakIt")} onClick={() => say(typed)} />
            <BigButton variant="soft" label={t("bigBoard")} onClick={() => setBoard(typed || lines.at(-1)?.text || "")} />
          </div>
        </form>
      )}

      <Section title={t("quickPhrases")}>
        <div className="grid grid-cols-2 gap-2">
          {phrases.map((p) => {
            const text = pickLabel(lang, p.text_ml, p.text_en);
            return <BigButton key={p.id} variant="surface" icon={p.icon ?? "💬"} label={text} className="min-h-14 !justify-start text-left text-[0.95rem]" onClick={() => say(text)} />;
          })}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <BigButton variant="surface" label={t("saveTranscript")} disabled={!lines.length} onClick={saveTranscript} />
        <BigButton variant="surface" label={t("clear")} disabled={!lines.length} onClick={() => { setLines([]); stt.reset(); }} />
      </div>

      {board !== null && (
        <div role="dialog" aria-modal="true" aria-label={t("bigBoard")} className="fixed inset-0 z-[900] bg-white text-black flex flex-col p-6" onClick={() => setBoard(null)}>
          <p className="flex-1 grid place-items-center text-center font-extrabold leading-tight break-words" style={{ fontSize: "clamp(3rem, 12vw, 9rem)" }}>{board || "…"}</p>
          <button className="min-h-16 rounded-3xl bg-black text-white font-bold text-xl">{t("close")}</button>
        </div>
      )}
    </div>
  );
}
