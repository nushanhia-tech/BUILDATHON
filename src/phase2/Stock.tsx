import { useA11y } from "../hooks/useA11y";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { useToast } from "../hooks/useToast";
import { supabase } from "../lib/supabase";
import { speak, stopSpeaking } from "../lib/tts";
import { vibrate } from "../lib/stt";
import type { Medicine } from "../lib/types";
import { BigButton } from "../components/ui/BigButton";
import { useRows } from "./shared";
export function StockCard({
  medicine: m,
  canEdit,
  onChanged,
}: {
  medicine: Medicine;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { t } = useI18n(),
    toast = useToast();
  const [qty, setQty] = useState("30"),
    [open, setOpen] = useState(false);
  if (m.stock_count == null) return null;
  return (
    <div className="grid gap-2">
      <p>
        {t("stockCount")}: <strong>{m.stock_count}</strong> ·{" "}
        {t("daysLeft", {
          days: Math.floor(
            m.stock_count /
              ((m.dose_per_time || 1) * Math.max(1, m.times.length)),
          ),
        })}
      </p>
      {canEdit && (
        <>
          <button
            className="min-h-12 bg-soft rounded-xl"
            onClick={() => setOpen(!open)}
          >
            {t("refill")}
          </button>
          {open && (
            <div className="flex gap-2">
              <input
                aria-label={t("quantity")}
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <BigButton
                label={t("save")}
                onClick={async () => {
                  const r = await supabase.rpc("refill_medicine", {
                    med: m.id,
                    quantity: Number(qty),
                  });
                  if (r.error) toast(r.error.message, "error");
                  else {
                    setOpen(false);
                    onChanged();
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function StockAlarm() {
  const { hearing } = useA11y();
  const { profile } = useAuth(),
    { t } = useI18n(),
    s = useOptionalUserSettings();
  const { rows, reload } = useRows<Medicine>("medicines", profile!.id);
  const [tick, setTick] = useState(0),
    [refilling, setRefilling] = useState(false);
  const enabled =
    s?.isOn("medicines") &&
    s.features("medicines").some((f) => f.key === "stock_alarm");
  const med = enabled
    ? rows.find(
        (m) =>
          m.active &&
          !m.needs_confirmation &&
          m.stock_count != null &&
          m.stock_count <= (m.low_stock_threshold ?? 5) &&
          Date.now() >
            Number(
              localStorage.getItem(
                `nila.stock.${m.id}.${m.stock_count === 0 ? "empty" : "low"}`,
              ) || 0,
            ),
      )
    : undefined;
  const msg = med
    ? med.stock_count === 0
      ? t("noStock")
      : t("lowStock", { name: med.name, n: med.stock_count! })
    : "";
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!med) return;
    let audio: AudioContext | undefined;
    let wake: WakeLockSentinel | undefined;
    let alive = true;
    const ring = () => {
      speak(msg, { force: true });
      vibrate([400, 200, 400]);
      try {
        audio ||= new AudioContext();
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.frequency.value = 600;
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + 0.6);
      } catch {}
    };
    ring();
    const unlock = () => {
      void audio?.resume();
      ring();
    };
    window.addEventListener("nila-alarm-audio", unlock);
    const interval = setInterval(ring, 12000);
    void navigator.wakeLock
      ?.request("screen")
      .then((w) => {
        if (alive) wake = w;
        else void w.release();
      })
      .catch(() => {});
    if ("Notification" in window && Notification.permission === "granted")
      try {
        new Notification(t("appName"), {
          body: msg,
          requireInteraction: true,
          tag: "stock-" + med.id,
        });
      } catch {}
    return () => {
      alive = false;
      window.removeEventListener("nila-alarm-audio", unlock);
      clearInterval(interval);
      stopSpeaking();
      void audio?.close();
      void wake?.release();
    };
  }, [med?.id, msg]);
  void tick;
  if (!med) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={msg}
      className={`fixed inset-0 z-[980] bg-danger text-white p-5 overflow-auto grid place-items-center ${hearing ? "flash-anim" : ""}`}
    >
      <div className="max-w-xl grid gap-4 text-center bg-danger p-5 rounded-3xl">
        <span className="text-6xl" aria-hidden="true">
          💊
        </span>
        <h2 className="text-3xl font-bold">{msg}</h2>
        <p>{t("alarmTip")}</p>
        <BigButton
          variant="surface"
          label={t("enableAlarmSound")}
          onClick={() => window.dispatchEvent(new Event("nila-alarm-audio"))}
        />
        <BigButton
          variant="surface"
          label={t("alarmAck")}
          onClick={() => {
            localStorage.setItem(
              `nila.stock.${med.id}.${med.stock_count === 0 ? "empty" : "low"}`,
              String(Date.now() + 86400000),
            );
            setTick((n) => n + 1);
            setRefilling(false);
          }}
        />
        <BigButton
          variant="surface"
          label={t("refill")}
          onClick={() => setRefilling(!refilling)}
        />
        {refilling && (
          <div className="card p-4 text-ink">
            <StockCard medicine={med} canEdit onChanged={() => void reload()} />
          </div>
        )}
        <Pharmacy medicine={med} />
      </div>
    </div>
  );
}
function Pharmacy({ medicine }: { medicine: Medicine }) {
  const { profile } = useAuth(),
    { t } = useI18n();
  const { rows } = useRows<{ id: string; phone: string; category: string }>(
    "contacts",
    profile!.id,
  );
  const pharmacy = rows.find((c) => c.category === "pharmacy");
  return pharmacy ? (
    <BigButton
      variant="surface"
      label={t("whatsapp")}
      href={`https://wa.me/${pharmacy.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("pharmacyOrder", { name: medicine.name, qty: 30 }))}`}
    />
  ) : null;
}
export function Alerts({
  userId,
  canHandle = true,
}: {
  userId?: string;
  canHandle?: boolean;
}) {
  const { t } = useI18n(),
    toast = useToast();
  const { rows, error } = useRows<{
    id: string;
    type: string;
    message: string;
    read: boolean;
    data: { stock?: number };
  }>("alerts", userId);
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-bold">{t("alertsTitle")}</h2>
      {error && <p role="alert">{error}</p>}
      {rows.map((a) => (
        <article key={a.id} className="card p-4">
          <p>
            {a.type === "handled"
              ? t("familyHandled", { name: a.message })
              : a.type === "low_water"
                ? t("waterLow")
                : a.type === "zone_exit"
                  ? t("zoneExit")
                  : a.type === "zone_return"
                    ? t("zoneReturn")
                    : a.type === "low_stock"
                      ? t("lowStock", { name: a.message, n: a.data.stock ?? 0 })
                      : a.message}
          </p>
          {canHandle && !a.read && (
            <BigButton
              label={
                a.type === "low_stock" ? t("buyingMedicine") : t("alarmAck")
              }
              onClick={async () => {
                const r = await supabase.rpc("handle_alert", {
                  alert_id: a.id,
                });
                if (r.error) toast(r.error.message, "error");
              }}
            />
          )}
        </article>
      ))}
    </section>
  );
}
