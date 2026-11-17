import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { useCamera } from "../../../hooks/useCamera";
import { speak } from "../../../lib/tts";
import { CameraBox } from "./CameraBox";

/** COCO-SSD label → Malayalam (40+ common objects). */
export const COCO_ML: Record<string, string> = {
  person: "ഒരാൾ", bicycle: "സൈക്കിൾ", car: "കാർ", motorcycle: "ബൈക്ക്", bus: "ബസ്", truck: "ലോറി", "traffic light": "ട്രാഫിക് ലൈറ്റ്",
  "stop sign": "സ്റ്റോപ്പ് ബോർഡ്", bench: "ബെഞ്ച്", bird: "പക്ഷി", cat: "പൂച്ച", dog: "നായ", cow: "പശു", sheep: "ആട്", horse: "കുതിര",
  backpack: "ബാഗ്", umbrella: "കുട", handbag: "ഹാൻഡ്ബാഗ്", suitcase: "പെട്ടി", bottle: "കുപ്പി", cup: "കപ്പ്", fork: "ഫോർക്ക്",
  knife: "കത്തി", spoon: "സ്പൂൺ", bowl: "പാത്രം", banana: "പഴം", apple: "ആപ്പിൾ", orange: "ഓറഞ്ച്", chair: "കസേര", couch: "സോഫ",
  "potted plant": "ചെടിച്ചട്ടി", bed: "കട്ടിൽ", "dining table": "മേശ", toilet: "ടോയ്‌ലറ്റ്", tv: "ടിവി", laptop: "ലാപ്ടോപ്പ്",
  mouse: "മൗസ്", remote: "റിമോട്ട്", keyboard: "കീബോർഡ്", "cell phone": "ഫോൺ", microwave: "മൈക്രോവേവ്", oven: "ഓവൻ", sink: "സിങ്ക്",
  refrigerator: "ഫ്രിഡ്ജ്", book: "പുസ്തകം", clock: "ക്ലോക്ക്", vase: "പൂപ്പാത്രം", scissors: "കത്രിക", "teddy bear": "പാവ", toothbrush: "ടൂത്ത്ബ്രഷ്",
};

type Det = { class: string; score: number; bbox: [number, number, number, number] };

export function ObjectsTab() {
  const { t, lang } = useI18n();
  const cam = useCamera();
  const [ready, setReady] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [sentence, setSentence] = useState("");
  const [dets, setDets] = useState<Det[]>([]);
  const modelRef = useRef<{ detect: (v: HTMLVideoElement) => Promise<Det[]> } | null>(null);

  useEffect(() => {
    if (!cam.active || modelRef.current) return;
    setReady("loading");
    void (async () => {
      try {
        await import("@tensorflow/tfjs");
        const coco = await import("@tensorflow-models/coco-ssd");
        modelRef.current = (await coco.load({ base: "lite_mobilenet_v2" })) as unknown as { detect: (v: HTMLVideoElement) => Promise<Det[]> };
        setReady("ready");
      } catch { setReady("error"); }
    })();
  }, [cam.active]);

  useEffect(() => {
    if (ready !== "ready" || !cam.active) return;
    let last = "", lastAt = 0, busy = false;
    const id = window.setInterval(async () => {
      const v = cam.videoRef.current, m = modelRef.current;
      if (!v || !m || !v.videoWidth || busy) return;
      busy = true;
      try {
        const res = (await m.detect(v)).filter((d) => d.score > 0.5).sort((a, b) => b.score - a.score).slice(0, 2);
        setDets(res);
        if (!res.length) { setSentence(t("nothingSeen")); return; }
        const parts = res.map((d) => {
          const cx = (d.bbox[0] + d.bbox[2] / 2) / v.videoWidth;
          const pos = cx < 1 / 3 ? t("left") : cx > 2 / 3 ? t("right") : t("front");
          const obj = lang === "en" ? d.class : COCO_ML[d.class] ?? d.class;
          return t("objectSentence", { pos, obj });
        });
        const s = parts.join(". ");
        setSentence(s);
        const now = performance.now();
        if (s !== last || now - lastAt > 4000) {
          if (s !== last || now - lastAt > 4000) { speak(s, { force: true }); last = s; lastAt = now; }
        }
      } finally { busy = false; }
    }, 700);
    return () => window.clearInterval(id);
  }, [ready, cam.active, cam.videoRef, t, lang]);

  return (
    <div className="flex flex-col gap-3">
      <p className="card p-4 bg-amber-50 text-warn font-bold" role="note">⚠️ {t("objectsDisclaimer")}</p>
      <p className="text-muted">{t("objectsHelp")}</p>
      <CameraBox videoRef={cam.videoRef} active={cam.active} error={cam.error} onStart={() => void cam.start()} onStop={cam.stop}
        overlay={cam.active && (
          <>
            {dets.map((d, i) => {
              const v = cam.videoRef.current;
              if (!v?.videoWidth) return null;
              const [x, y, w, h] = d.bbox;
              return <div key={i} className="absolute border-4 border-yellow-300 rounded-lg" aria-hidden="true"
                style={{ left: `${(x / v.videoWidth) * 100}%`, top: `${(y / v.videoHeight) * 100}%`, width: `${(w / v.videoWidth) * 100}%`, height: `${(h / v.videoHeight) * 100}%` }} />;
            })}
            <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-4 text-center text-[1.6rem] font-bold" aria-live="polite">
              {ready === "loading" ? t("loadingModel") : ready === "error" ? t("error") : sentence}
            </div>
          </>
        )} />
    </div>
  );
}
