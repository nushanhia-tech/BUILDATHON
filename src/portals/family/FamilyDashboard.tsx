import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { useRealtime } from "../../hooks/useRealtime";
import { fmtDate, fmtDateTime, fmtTime, hhmm12 } from "../../lib/time";
import { mapsLink } from "../../lib/geo";
import { Badge, Empty, Section, Spinner } from "../../components/ui/Bits";
import { ActivityLogList } from "../../components/ActivityLogList";
import { useFamilyScope } from "./familyData";
import { loadUserStatus, type UserStatus } from "./userStatus";
import { reqStatus } from "../user/wheelchair/wcLabels";

export default function FamilyDashboard() {
  const { t, lang } = useI18n();
  const { userId, profile } = useFamilyScope();
  const [s, setS] = useState<UserStatus | null>(null);
  const load = useCallback(async () => setS(await loadUserStatus(userId)), [userId]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("med_logs", () => void load(), { filter: `user_id=eq.${userId}` });
  useRealtime("checkins", () => void load(), { filter: `user_id=eq.${userId}` });
  useRealtime("sos_events", () => void load(), { filter: `user_id=eq.${userId}` });

  if (!s) return <Spinner />;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-5 flex flex-col gap-2">
        <h2 className="font-bold text-lg">💚 {t("imFine").replace("💚 ", "")}</h2>
        <p className={`text-xl font-bold ${s.checkin ? "text-success" : s.checkinOverdue ? "text-danger" : ""}`}>
          {s.checkin ? t("famCheckin", { time: fmtTime(s.checkin.created_at, lang) }) : t("famNoCheckin")}
        </p>
        <p className="text-muted">{t("deadline")}: {hhmm12(s.deadline, lang)}</p>
        <p className="text-muted">{t("lastActive", { time: profile?.last_seen ? fmtDateTime(profile.last_seen, lang) : t("never") })}</p>
      </div>

      <div className="card p-5 flex flex-col gap-2">
        <h2 className="font-bold text-lg">{t("famMedicines")} · {s.taken}/{s.total}</h2>
        {s.doses.length === 0 ? <p className="text-muted">{t("noMedicines")}</p> : (
          <ul className="flex flex-col gap-1">
            {s.doses.map((d) => (
              <li key={d.medicine.id + d.time} className="flex items-center gap-2">
                <span className="flex-1">{hhmm12(d.time, lang)} · {d.medicine.name}</span>
                <Badge tone={d.taken ? "success" : d.status === "missed" ? "danger" : "soft"}>{d.taken ? t("takenDone") : d.status === "missed" ? t("missed") : t("upcoming")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5 flex flex-col gap-2">
        <h2 className="font-bold text-lg">{t("todayTasks")}</h2>
        {s.tasks.length === 0 ? <p className="text-muted">{t("noTasks")}</p> : (
          <ul className="flex flex-col gap-1">{s.tasks.map((x) => <li key={x.id}>{x.done ? "✅" : "⬜"} {x.title} {x.due_at && <span className="text-muted">· {fmtTime(x.due_at, lang)}</span>}</li>)}</ul>
        )}
      </div>

      <div className="card p-5 flex flex-col gap-2">
        <h2 className="font-bold text-lg">🆘 {t("sosEvents")}</h2>
        {!s.lastSos ? <p className="text-muted">—</p> : (
          <ul className="flex flex-col gap-1">
            {[s.lastSos, ...s.sosToday.filter((e) => e.id !== s.lastSos!.id)].map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className="flex-1">{fmtDateTime(e.created_at, lang)}</span>
                {e.lat != null && e.lng != null && <a className="text-primary underline font-semibold" href={mapsLink(e.lat, e.lng)} target="_blank" rel="noreferrer">{t("openMap")}</a>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5 flex flex-col gap-2">
        <h2 className="font-bold text-lg">♿ {t("wheelchairRequests")}</h2>
        {s.requests.length === 0 ? <p className="text-muted">{t("noRequests")}</p> : (
          <ul className="flex flex-col gap-1">
            {s.requests.map((r) => <li key={r.id}>{reqStatus(t, r.status)} · {fmtDate(r.created_at, lang)}{r.return_date && r.status === "accepted" ? ` · ${t("returnBy", { date: fmtDate(r.return_date, lang) })}` : ""}</li>)}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2">
        <Section title={t("activityLog")}><ActivityLogList userId={userId} limit={15} /></Section>
      </div>
      {s.doses.length === 0 && s.tasks.length === 0 && !s.lastSos && <Empty />}
    </div>
  );
}
