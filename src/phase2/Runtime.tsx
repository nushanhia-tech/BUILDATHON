import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { useRealtime } from "../hooks/useRealtime";
import { useLocationConsent } from "./Location";
import { defaultWater } from "./Water";
import { speak } from "../lib/tts";
import { vibrate } from "../lib/stt";
import { useRows } from "./shared";
import { BigButton } from "../components/ui/BigButton";
export function PhaseRuntime() {
  const { profile } = useAuth(),
    s = useOptionalUserSettings(),
    { t } = useI18n(),
    toast = useToast(),
    uid = profile!.id;
  const { consent, setConsent } = useLocationConsent(uid);
  const [flash, setFlash] = useState(false);
  const [showTip, setShowTip] = useState(
    () => localStorage.getItem(`nila.reminder-tip.${uid}`) !== "done",
  );
  const lastPing = useRef(0);
  const { rows: zones } = useRows<{ id: string; lat: number; lng: number }>(
    "safe_zones",
    uid,
  );
  const { rows: contacts } = useRows<{
    id: string;
    phone: string;
    is_sos: boolean;
  }>("contacts", uid);
  const locationEnabled = !!s?.isOn("location_safety");
  const waterEnabled =
    !!s?.isOn("water") &&
    !!s.features("water").some((f) => f.key === "water_reminders");
  useEffect(() => {
    if (!consent.enabled || !locationEnabled) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - lastPing.current < 5000) return;
        lastPing.current = Date.now();
        void supabase
          .rpc("record_location", {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy_m: p.coords.accuracy,
          })
          .then((r) => {
            if (r.error) toast(r.error.message, "error");
          });
      },
      (e) => toast(e.message, "error"),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [consent.enabled, locationEnabled, uid]);
  useEffect(() => {
    if (!waterEnabled) return;
    let alive = true;
    const check = async () => {
      const r = await supabase
        .from("water_settings")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (!alive) return;
      const cfg = r.data || defaultWater,
        now = new Date(),
        time = now.toTimeString().slice(0, 5);
      if (time < cfg.start_time.slice(0, 5) || time > cfg.end_time.slice(0, 5))
        return;
      const key = `nila.water.reminder.${uid}`,
        last = Number(localStorage.getItem(key) || Date.now());
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, String(last));
        return;
      }
      if (Date.now() - last < cfg.interval_min * 60000) return;
      const log = await supabase
        .from("water_logs")
        .select("amount_ml,created_at")
        .eq("user_id", uid)
        .gte(
          "created_at",
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          ).toISOString(),
        );
      if (
        !alive ||
        log.error ||
        log.data?.some(
          (x) => Date.now() - new Date(x.created_at).getTime() < 1800000,
        ) ||
        (log.data || []).reduce((total, x) => total + x.amount_ml, 0) >=
          cfg.daily_goal_ml
      )
        return;
      localStorage.setItem(key, String(Date.now()));
      speak(t("waterReminder"), { force: true });
      if (profile!.modes.includes("hearing")) {
        vibrate([200, 100, 200]);
        setFlash(true);
        setTimeout(() => setFlash(false), 2500);
      }
      toast(t("waterReminder"));
      if ("Notification" in window && Notification.permission === "granted")
        try {
          new Notification(t("appName"), {
            body: t("waterReminder"),
            tag: "water",
          });
        } catch {}
    };
    void check();
    const timer = setInterval(() => {
      void check();
      void supabase.rpc("check_water_intake");
    }, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [waterEnabled, uid, t, profile?.modes]);
  useRealtime(
    "alerts",
    (p) => {
      if (
        p.eventType === "INSERT" &&
        (p.new as { type: string }).type === "handled"
      ) {
        const msg = t("familyHandled", {
          name: (p.new as { message: string }).message,
        });
        toast(msg, "success");
        speak(msg, { force: true });
        vibrate([150, 100, 150]);
      }
    },
    { filter: `user_id=eq.${uid}` },
  );
  const home = zones[0],
    contact = contacts.find((c) => c.is_sos);
  return (
    <>
      {showTip && (
        <aside className="card p-4 mx-auto max-w-2xl grid gap-2">
          <p>{t("alarmTip")}</p>
          {"Notification" in window &&
            Notification.permission === "default" && (
              <BigButton
                variant="soft"
                label={t("notifPermission")}
                onClick={() => void Notification.requestPermission()}
              />
            )}
          <button
            className="min-h-12 text-primary"
            onClick={() => {
              localStorage.setItem(`nila.reminder-tip.${uid}`, "done");
              setShowTip(false);
            }}
          >
            {t("close")}
          </button>
        </aside>
      )}
      {flash && (
        <div
          className="fixed inset-0 pointer-events-none z-[900] flash-anim"
          aria-hidden="true"
        />
      )}
      {consent.enabled && (
        <div className="sharing-banner card p-3 mx-auto max-w-2xl flex flex-wrap items-center gap-2">
          <span>📍 {t("locationSharing")}</span>
          <button
            className="min-h-12 px-4 rounded-full bg-soft text-primary"
            onClick={async () => {
              const r = await supabase
                .from("location_sharing")
                .update({
                  enabled: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", uid);
              if (r.error) toast(r.error.message, "error");
              else setConsent({ ...consent, enabled: false });
            }}
          >
            {t("stopSharing")}
          </button>
        </div>
      )}
      {consent.enabled && consent.outside && (
        <div className="card p-4 mx-auto max-w-2xl grid gap-2">
          <h2>{t("outsideZone")}</h2>
          {home && (
            <BigButton
              label={t("homeDirections")}
              href={`https://www.google.com/maps/dir/?api=1&destination=${home.lat},${home.lng}`}
            />
          )}
          {contact && (
            <BigButton label={t("call")} href={`tel:${contact.phone}`} />
          )}
          <Link
            className="min-h-14 rounded-xl bg-danger text-white p-3"
            to="/app/family?sos=1"
          >
            SOS
          </Link>
        </div>
      )}
    </>
  );
}
export function HomeExtras() {
  const { profile } = useAuth(),
    s = useOptionalUserSettings(),
    { t } = useI18n();
  const { rows: people } = useRows<{
    id: string;
    name: string;
    birthday: string;
  }>("gallery_people", profile!.id);
  const { rows: contacts } = useRows<{
    id: string;
    name: string;
    phone: string;
    is_favourite: boolean;
    needs_confirmation?: boolean;
  }>("contacts", profile!.id);
  const birthday = new Date().toLocaleDateString("en-CA", {
    month: "2-digit",
    day: "2-digit",
  });
  return (
    <section className="grid gap-3">
      {s?.isOn("family_gallery") &&
        s.features("family_gallery").some((f) => f.key === "birthdays") &&
        people
          .filter(
            (p) =>
              p.birthday &&
              new Date(p.birthday + "T12:00:00").toLocaleDateString("en-CA", {
                month: "2-digit",
                day: "2-digit",
              }) === birthday,
          )
          .map((p) => (
            <Link className="card p-4" key={p.id} to="/app/gallery">
              🎂 {t("birthdayToday", { name: p.name })}
            </Link>
          ))}
      {s?.isOn("family_sos") &&
        s.features("family_sos").some((f) => f.key === "favourites") &&
        contacts
          .filter((c) => c.is_favourite && !c.needs_confirmation)
          .map((c) => (
            <BigButton
              key={c.id}
              variant="surface"
              label={`⭐ ${c.name}`}
              href={`tel:${c.phone}`}
            />
          ))}
    </section>
  );
}
interface ZoneNotice {
  id: string;
  user_id: string;
  type: string;
  read: boolean;
  data: { lat: number; lng: number; stock?: number };
  message: string;
}
export function FamilyPhaseNotifications() {
  const { t } = useI18n(),
    toast = useToast();
  const [zone, setZone] = useState<ZoneNotice | null>(null),
    [phone, setPhone] = useState("");
  useEffect(() => {
    void supabase.rpc("check_water_intake");
    void supabase
      .from("alerts")
      .select("*")
      .in("type", ["zone_exit", "zone_return"])
      .order("created_at", { ascending: false })
      .limit(1)
      .then((r) => {
        const a = r.data?.[0] as ZoneNotice | undefined;
        if (a?.type === "zone_exit" && !a.read) setZone(a);
      });
  }, []);
  useEffect(() => {
    setPhone("");
    if (zone)
      void supabase
        .from("profiles")
        .select("phone")
        .eq("id", zone.user_id)
        .maybeSingle()
        .then((r) => setPhone(r.data?.phone || ""));
  }, [zone?.user_id]);
  useRealtime("location_sharing", (p) => {
    const row = p.new as {
      user_id: string;
      enabled: boolean;
      share_with_family: boolean;
    };
    if (row.user_id === zone?.user_id && !row.enabled) setZone(null);
  });
  useRealtime("alerts", (p) => {
    if (p.eventType !== "INSERT") return;
    const a = p.new as ZoneNotice;
    if (a.type === "zone_exit") setZone(a);
    if (a.type === "zone_return" && a.user_id === zone?.user_id) setZone(null);
    const msg =
      a.type === "zone_exit"
        ? t("zoneExit")
        : a.type === "zone_return"
          ? t("zoneReturn")
          : a.type === "low_water"
            ? t("waterLow")
            : a.type === "low_stock"
              ? t("lowStock", { name: a.message, n: a.data.stock ?? 0 })
              : a.message;
    toast(msg);
    if ("Notification" in window && Notification.permission === "granted")
      try {
        new Notification(t("appName"), { body: msg, requireInteraction: true });
      } catch {}
  });
  return zone ? (
    <aside
      role="alert"
      className="bg-danger text-white rounded-2xl p-4 grid gap-3"
    >
      <p className="text-xl font-bold">⚠️ {t("zoneExit")}</p>
      <div className="flex flex-wrap gap-2">
        {phone && (
          <BigButton
            variant="surface"
            label={t("call")}
            href={`tel:${phone}`}
          />
        )}
        <BigButton
          variant="surface"
          label={t("openMap")}
          href={`https://www.google.com/maps/dir/?api=1&destination=${zone.data.lat},${zone.data.lng}`}
        />
        <BigButton
          variant="surface"
          label={t("alarmAck")}
          onClick={async () => {
            const r = await supabase.rpc("handle_alert", { alert_id: zone.id });
            if (r.error) toast(r.error.message, "error");
            else setZone(null);
          }}
        />
      </div>
    </aside>
  ) : null;
}
