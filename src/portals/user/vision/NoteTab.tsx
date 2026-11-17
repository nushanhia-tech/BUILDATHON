import { useEffect, useRef, useState } from "react";
import type * as tfTypes from "@tensorflow/tfjs";
import { useI18n } from "../../../lib/i18n";
import { useCamera } from "../../../hooks/useCamera";
import { speak } from "../../../lib/tts";
import { vibrate } from "../../../lib/stt";
import { CameraBox } from "./CameraBox";

const MODEL_URL = (import.meta.env.VITE_NOTE_MODEL_URL as string | undefined)?.trim();

/**
 * Indian currency note recognition with a Teachable Machine image model.
 * Loaded directly with TensorFlow.js (same format/preprocessing as @teachablemachine/image).
 */
export function NoteTab() {
  const { t } = useI18n();
  const cam = useCamera();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [top, setTop] = useState<{ label: string; p: number } | null>(null);
  const modelRef = useRef<{ tf: typeof tfTypes; model: tfTypes.LayersModel; labels: string[] } | null>(null);

  useEffect(() => {
    if (!MODEL_URL || !cam.active || modelRef.current) return;
    setStatus("loading");
    const base = MODEL_URL.endsWith("/") ? MODEL_URL : `${MODEL_URL}/`;
    void (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        const [model, meta] = await Promise.all([tf.loadLayersModel(`${base}model.json`), fetch(`${base}metadata.json`).then((r) => r.json())]);
        modelRef.current = { tf, model, labels: (meta.labels as string[]) ?? [] };
        setStatus("ready");
      } catch { setStatus("error"); }
    })();
  }, [cam.active]);

  useEffect(() => {
    if (status !== "ready" || !cam.active) return;
    let since = 0, current = "", lastSpoken = "", lastAt = 0;
    const id = window.setInterval(() => {
      const v = cam.videoRef.current, m = modelRef.current;
      if (!v || !m || !v.videoWidth) return;
      const probs = m.tf.tidy(() => {
        const img = m.tf.browser.fromPixels(v);
        const s = Math.min(img.shape[0], img.shape[1]);
        const y = Math.floor((img.shape[0] - s) / 2), x = Math.floor((img.shape[1] - s) / 2);
        const crop = img.slice([y, x, 0], [s, s, 3]);
        const input = m.tf.image.resizeBilinear(crop, [224, 224]).toFloat().div(127.5).sub(1).expandDims(0);
        return (m.model.predict(input) as tfTypes.Tensor).dataSync() as Float32Array;
      });
      let bi = 0;
      probs.forEach((p, i) => { if (p > probs[bi]) bi = i; });
      const label = m.labels[bi] ?? String(bi);
      setTop({ label, p: probs[bi] });
      const amount = label.match(/\d+/)?.[0];
      const now = performance.now();
      if (probs[bi] > 0.85 && amount) {
        if (current !== amount) { current = amount; since = now; }
        if (now - since >= 1000 && (lastSpoken !== amount || now - lastAt > 6000) && now - lastAt > 2500) {
          lastSpoken = amount; lastAt = now;
          speak(t("noteSays", { n: amount }), { force: true });
          vibrate(200);
        }
      } else { current = ""; since = 0; }
    }, 250);
    return () => window.clearInterval(id);
  }, [status, cam.active, cam.videoRef, t]);

  if (!MODEL_URL) {
    return <div className="card p-6 text-center"><p className="text-4xl mb-2" aria-hidden="true">💵</p><p className="text-[1.4rem] font-bold">{t("noModel")}</p><p className="text-muted">{t("noModelSub")}</p></div>;
  }
  const amount = top?.label.match(/\d+/)?.[0];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">{t("noteHelp")}</p>
      <CameraBox videoRef={cam.videoRef} active={cam.active} error={cam.error} onStart={() => void cam.start()} onStop={cam.stop}
        overlay={cam.active && (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-4 text-center" aria-live="polite">
            {status === "loading" && <p className="text-xl">{t("loadingModel")}</p>}
            {status === "error" && <p className="text-xl">{t("error")}</p>}
            {status === "ready" && top && <p className="text-[2rem] font-extrabold">{amount && top.p > 0.85 ? t("noteSays", { n: amount }) : "…"}</p>}
          </div>
        )} />
    </div>
  );
}
