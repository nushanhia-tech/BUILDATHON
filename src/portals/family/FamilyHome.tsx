import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { fmtDateTime, fmtTime } from "../../lib/time";
import { Badge, Empty, Spinner } from "../../components/ui/Bits";
import { useFamilyLinks } from "./familyData";
import { loadUserStatus, type UserStatus } from "./userStatus";

export default function FamilyHome() {
  const { t, lang } = useI18n();
  const { links, loaded } = useFamilyLinks();
  const [status, setStatus] = useState<Record<string, UserStatus>>({});
  useEffect(() => {
    const active = links.filter((l) => l.link.status === "active");
    void Promise.all(active.map(async (l) => [l.link.user_id, await loadUserStatus(l.link.user_id)] as const))
      .then((rows) => setStatus(Object.fromEntries(rows)));
  }, [links]);

  if (!loaded) return <Spinner />;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[1.8rem] font-bold flex-1">{t("famHomeTitle")}</h1>
        <Link to="/family/link" className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold flex items-center">{t("famLinkUser")}</Link>
      </div>
      {links.length === 0 ? <Empty text={t("famNoUsers")} icon="👨‍👩‍👧" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {links.map(({ link, profile }) => {
            const s = status[link.user_id];
            const pending = link.status === "pending";
            const body = (
              <div className={`card p-5 flex flex-col gap-3 h-full ${s?.sosToday.length ? "ring-4 ring-danger" : ""}`}>
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                    : <span className="w-14 h-14 rounded-full bg-soft grid place-items-center text-2xl font-bold text-primary">{profile?.name?.[0] ?? "?"}</span>}
                  <div className="flex-1">
                    <p className="font-bold text-lg">{profile?.name ?? "…"}</p>
                    <Badge tone={pending ? "warn" : "soft"}>{pending ? t("famPending") : t(`level_${link.level}` as const)}</Badge>
                  </div>
                </div>
                {!pending && !s && <Spinner />}
                {s && (
                  <ul className="flex flex-col gap-1">
                    <li className={s.checkin ? "text-success font-semibold" : s.checkinOverdue ? "text-danger font-semibold" : ""}>
                      {s.checkin ? t("famCheckin", { time: fmtTime(s.checkin.created_at, lang) }) : t("famNoCheckin")}
                    </li>
                    <li className={s.missed.length ? "text-danger font-semibold" : ""}>{t("famDoses", { taken: s.taken, total: s.total })}{s.missed.length ? ` · ${t("missed")} ${s.missed.length}` : ""}</li>
                    {s.lastSos && <li className={s.sosToday.length ? "text-danger font-bold" : "text-muted"}>{t("famLastSos", { time: fmtDateTime(s.lastSos.created_at, lang) })}</li>}
                    <li className="text-sm text-muted">{t("lastActive", { time: profile?.last_seen ? fmtDateTime(profile.last_seen, lang) : t("never") })}</li>
                  </ul>
                )}
              </div>
            );
            return pending ? <div key={link.id}>{body}</div> : <Link key={link.id} to={`/family/u/${link.user_id}`} className="block">{body}</Link>;
          })}
        </div>
      )}
    </div>
  );
}
