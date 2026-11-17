import { useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { speak } from "../../../lib/tts";
import { BigButton } from "../../../components/ui/BigButton";

export function OcrTab() {
  const { t } = useI18n();
  const camInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [size, setSize] = useState(1.6);
  const [simple, setSimple] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "busy" | "error">("idle");
  const [aiMsg, setAiMsg] = useState("");

  const run = async (file: File | undefined) => {
    if (!file) return;
    setImg(URL.createObjectURL(file));
    setText(""); setSimple(null); setProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("mal+eng", 1, {
        logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100)); },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const out = data.text.replace(/\n{3,}/g, "\n\n").trim();
      setText(out);
      if (out) speak(out); else speak(t("noText"));
    } catch {
      setText(""); speak(t("error"));
    } finally { setProgress(null); }
  };

  const simplify = async () => {
    if (!navigator.onLine) { setAiState("error"); setAiMsg(t("offline")); return; }
    setAiState("busy");
    try {
      const r = await fetch("/api/simplify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (r.status === 429) { setAiState("error"); setAiMsg(t("aiBusy")); return; }
      if (!r.ok) { setAiState("error"); setAiMsg(t("aiError")); return; }
      const j = (await r.json()) as { text: string };
      setSimple(j.text); setAiState("idle"); speak(j.text, { force: true });
    } catch { setAiState("error"); setAiMsg(navigator.onLine ? t("aiError") : t("offline")); }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t("ocrHelp")}</p>
      <div className="grid grid-cols-2 gap-3">
        <BigButton label={t("takePhoto")} onClick={() => camInput.current?.click()} className="min-h-24" />
        <BigButton variant="surface" label={t("uploadImage")} onClick={() => fileInput.current?.click()} className="min-h-24" />
      </div>
      <input ref={camInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void run(e.target.files?.[0])} />
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void run(e.target.files?.[0])} />
      {img && <img src={img} alt="" className="w-full max-h-64 object-contain rounded-3xl bg-soft" />}
      {progress !== null && (
        <div className="card p-4" role="status">
          <p className="font-semibold mb-2">{t("reading", { p: progress })}</p>
          <div className="h-5 rounded-full bg-line overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {progress === null && img && !text && <p className="card p-4 text-warn">{t("noText")}</p>}
      {text && (
        <section className="card p-4 flex flex-col gap-3" aria-label={t("ocrResult")}>
          <div className="flex items-center gap-2">
            <h2 className="font-bold flex-1">{t("ocrResult")}</h2>
            <button type="button" aria-label="smaller text" onClick={() => setSize((s) => Math.max(1, s - 0.2))} className="min-h-14 min-w-14 rounded-2xl bg-soft font-bold">{t("fontSmaller")}</button>
            <button type="button" aria-label="bigger text" onClick={() => setSize((s) => Math.min(3.2, s + 0.2))} className="min-h-14 min-w-14 rounded-2xl bg-soft font-bold text-xl">{t("fontBigger")}</button>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed font-semibold" style={{ fontSize: `${size}rem` }}>{text}</p>
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant="soft" label={t("readThis")} onClick={() => speak(text, { force: true })} />
            <BigButton label={aiState === "busy" ? t("simplifying") : t("simplify")} disabled={aiState === "busy"} onClick={simplify} />
          </div>
          <p className="text-sm bg-amber-50 text-warn rounded-2xl p-3 font-semibold">⚠️ {t("aiDisclaimer")}</p>
          {aiState === "error" && <p className="text-danger font-semibold" role="alert">{aiMsg}</p>}
          {simple && (
            <div className="bg-soft rounded-2xl p-4">
              <p className="font-bold mb-1">🤖 {t("simplified")}</p>
              <p className="whitespace-pre-wrap" style={{ fontSize: `${size}rem` }}>{simple}</p>
              <BigButton variant="surface" className="mt-3 w-full" label={t("readThis")} onClick={() => speak(simple, { force: true })} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
