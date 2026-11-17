import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { grabFrame, useCamera } from "../../../hooks/useCamera";
import { speak } from "../../../lib/tts";
import { BigButton } from "../../../components/ui/BigButton";
import { Toggle } from "../../../components/ui/Bits";
import { CameraBox } from "./CameraBox";

/** Average luminance 0–255 of a frame. */
export function luminance(c: HTMLCanvasElement) {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 16) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return sum / (d.length / 16);
}
export const lightLevel = (l: number) => (l < 40 ? "dark" : l < 100 ? "dim" : "bright") as "dark" | "dim" | "bright";

export function LightTab() {
  const { t } = useI18n();
  const cam = useCamera();
  const [lum, setLum] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const lastLevel = useRef<string>("");

  const check = useCallback((announce = true) => {
    const v = cam.videoRef.current;
    if (!v) return;
    const c = grabFrame(v, 160);
    if (!c) return;
    const l = luminance(c);
    setLum(l);
    const level = lightLevel(l);
    if (announce || level !== lastLevel.current) speak(t(level), { force: true });
    lastLevel.current = level;
  }, [cam.videoRef, t]);

  useEffect(() => {
    if (!auto || !cam.active) return;
    const id = window.setInterval(() => check(false), 3000);
    return () => window.clearInterval(id);
  }, [auto, cam.active, check]);

  const level = lum == null ? null : lightLevel(lum);
  const icon = level === "dark" ? "🌑" : level === "dim" ? "🌥️" : level === "bright" ? "☀️" : "💡";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">{t("lightHelp")}</p>
      <CameraBox videoRef={cam.videoRef} active={cam.active} error={cam.error} onStart={() => void cam.start()} onStop={cam.stop} />
      {cam.active && (
        <>
          <BigButton label={t("checkNow")} className="min-h-14 text-[1.05rem]" onClick={() => check(true)} />
          <div className="card p-4"><Toggle label={t("autoMode")} checked={auto} onChange={setAuto} /></div>
        </>
      )}
      {level && (
        <div className="hero p-6 text-center" aria-live="polite">
          <p className="text-6xl" aria-hidden="true">{icon}</p>
          <p className="text-[2rem] font-extrabold">{t(level)}</p>
          <p className="opacity-80">{Math.round(lum!)} / 255</p>
        </div>
      )}
    </div>
  );
}
