import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { useRealtime } from "../../hooks/useRealtime";
import { fmtDate, fmtTime, hhmm12 } from "../../lib/time";
import { mapsLink } from "../../lib/geo";
import { Empty, Spinner } from "../../components/ui/Bits";
import { useFamilyLinks } from "./familyData";
import { loadUserStatus } from "./userStatus";

interface Alert { key: string; tone: "danger" | "warn"; text: string; link?: string; at: number; }

/** SOS (realtime), missing check-ins, missed doses (30+ min) and wheelchair return dates. */
export default function FamilyAlerts() {
  const { t, lang } = useI18n();
  const { links, loaded } = useFamilyLinks();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const active = links.filter((l) => l.link.status === "active");

  const compute = useCallback(async () => {
    const out: Alert[] = [];
    for (const l of active) {
      const name = l.profile?.name ?? "";
      const s = await loadUserStatus(l.link.user_id);
      s.sosToday.forEach((e) => out.push({ key: `sos-${e.id}`, tone: "danger", text: t("alertSos", { name, time: fmtTime(e.created_at, lang) }), link: e.lat != null && e.lng != null ? mapsLink(e.lat, e.lng) : undefined, at: +new Date(e.created_at) }));
      if (s.checkinOverdue) out.push({ key: `ci-${l.link.user_id}`, tone: "warn", text: t("alertNoCheckin", { name, deadline: hhmm12(s.deadline, lang) }), at: Date.now() - 1 });
      s.missed.forEach((d) => out.push({ key: `md-${d.medicine.id}-${d.time}`, tone: "warn", text: t("alertMissedDose", { name, med: d.medicine.name, time: hhmm12(d.time, lang) }), at: d.scheduled.getTime() }));
      s.returnsDue.forEach((r) => out.push({ key: `rt-${r.id}`, tone: "warn", text: t("alertReturn", { name, date: fmtDate(r.return_date!, lang) }), at: Date.now() - 2 }));
    }
    setAlerts(out.sort((a, b) => (a.tone === b.tone ? b.at - a.at : a.tone === "danger" ? -1 : 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, t, lang]);
  useEffect(() => { if (loaded) void compute(); }, [loaded, compute]);
  useRealtime("sos_events", () => void compute(), { event: "INSERT", enabled: active.length > 0 });
  useRealtime("checkins", () => void compute(), { event: "INSERT", enabled: active.length > 0 });
  useRealtime("med_logs", () => void compute(), { enabled: active.length > 0 });

  if (!alerts) return <Spinner />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[1.8rem] font-bold flex-1">{t("alertsTitle")}</h1>
        {"Notification" in window && Notification.permission === "default" && (
          <button onClick={() => void Notification.requestPermission()} className="min-h-12 px-4 rounded-2xl bg-soft font-semibold">{t("notifPermission")}</button>
        )}
      </div>
      {alerts.length === 0 ? <Empty text={t("noAlerts")} icon="💚" /> : (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {alerts.map((a) => (
            <li key={a.key} className={`rounded-2xl p-4 font-semibold flex flex-wrap items-center gap-3 ${a.tone === "danger" ? "bg-danger text-on-danger text-lg" : "card border-l-8 border-warn"}`}>
              <span className="flex-1">{a.text}</span>
              {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="bg-white text-danger rounded-xl px-4 py-2">{t("openMap")}</a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
