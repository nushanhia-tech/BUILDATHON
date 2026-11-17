import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { useMic, useWakeLock } from "../../../hooks/useMic";
import { useUserSettings } from "../../../hooks/useUserSettings";
import { vibrate, vibrationSupported } from "../../../lib/stt";
import { BigButton } from "../../../components/ui/BigButton";
import { FlashOverlay } from "../../../components/ui/FlashOverlay";
import { Section, Empty } from "../../../components/ui/Bits";

/** Sensitivity 0..100 → threshold in dBFS (higher sensitivity = quieter sounds trigger). */
export const thresholdDb = (sens: number) => -10 - sens * 0.5;

export function SoundAlert() {
  const { t, lang } = useI18n();
  const { settings, save } = useUserSettings();
  const mic = useMic();
  const [running, setRunning] = useState(false);
  const [db, setDb] = useState(-100);
  const [sens, setSens] = useState(settings?.sound_alert_sensitivity ?? 60);
  const [flash, setFlash] = useState(false);
  const [log, setLog] = useState<{ at: Date; db: number }[]>([]);
  const wake = useWakeLock(running);
  const sensRef = useRef(sens);
  sensRef.current = sens;
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running || !mic.stream) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(mic.stream);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    let aboveSince = 0, lastAlert = 0;
    const id = window.setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.max(-100, 20 * Math.log10(rms || 1e-10));
      setDb(level);
      const now = performance.now();
      if (level > thresholdDb(sensRef.current)) {
        if (!aboveSince) aboveSince = now;
        if (now - aboveSince > 200 && now - lastAlert > 5000) {
          lastAlert = now;
          aboveSince = 0;
          setFlash(true);
          vibrate([300, 100, 300, 100, 300]);
          setLog((l) => [{ at: new Date(), db: Math.round(level) }, ...l].slice(0, 50));
        }
      } else aboveSince = 0;
    }, 50);
    return () => { window.clearInterval(id); src.disconnect(); void ctx.close(); };
  }, [running, mic.stream]);

  // Persist the sensitivity (debounced) so family can see/adjust it too.
  useEffect(() => {
    if (settings && sens === settings.sound_alert_sensitivity) return;
    const id = setTimeout(() => void save({ sound_alert_sensitivity: sens }).catch(() => {}), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sens]);

  const start = async () => { const s = await mic.start(); if (s) setRunning(true); };
  const stop = () => { setRunning(false); mic.stop(); setDb(-100); };
  const pct = Math.min(100, Math.max(0, ((db + 80) / 80) * 100));
  const thrPct = Math.min(100, Math.max(0, ((thresholdDb(sens) + 80) / 80) * 100));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t("alertHelp")}</p>
      {!vibrationSupported && <p className="card p-3 text-warn">{t("noVibration")}</p>}
      {running ? <BigButton variant="danger" label={t("stopAlert")} className="min-h-24 text-[1.4rem]" onClick={stop} />
        : <BigButton label={t("startAlert")} className="min-h-24 text-[1.4rem]" onClick={start} />}
      {mic.error && <p className="text-danger">{t("micError")}</p>}
      {running && <p className="card p-3">{wake ? t("wakeLockOn") : `💡 ${t("keepScreenOn")}`}</p>}

      <div className="card p-4 flex flex-col gap-3">
        <p className="font-semibold">{t("level")}: {db > -100 ? `${Math.round(db)} dB` : "—"}</p>
        <div className="relative h-10 rounded-full bg-line overflow-hidden" role="meter" aria-valuemin={-80} aria-valuemax={0} aria-valuenow={Math.round(db)} aria-label={t("level")}>
          <div className="h-full transition-[width] duration-75" style={{ width: `${pct}%`, background: pct > thrPct ? "var(--danger)" : "var(--success)" }} />
          <div className="absolute top-0 bottom-0 w-1 bg-ink" style={{ left: `${thrPct}%` }} aria-hidden="true" />
        </div>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">{t("sensitivity")}: {sens}</span>
          <input type="range" min={0} max={100} value={sens} onChange={(e) => setSens(Number(e.target.value))} />
        </label>
      </div>

      <Section title={t("alertLog")}>
        {log.length === 0 ? <Empty icon="🔕" /> : (
          <ul className="card divide-y divide-line">
            {log.map((l, i) => <li key={i} className="p-3">🔔 {l.at.toLocaleTimeString(lang === "ml" ? "ml-IN" : "en-IN")} · {l.db} dB</li>)}
          </ul>
        )}
      </Section>
      <FlashOverlay open={flash} text={t("loudSound")} sub={new Date().toLocaleTimeString()} onClose={() => setFlash(false)} />
    </div>
  );
}
