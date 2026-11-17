import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../lib/i18n";
import { FamilyScopeCtx, useFamilyLinks } from "./familyData";
import { useRealtime } from "../../hooks/useRealtime";
import type { SosEvent } from "../../lib/types";
import { fmtTime } from "../../lib/time";
import { mapsLink } from "../../lib/geo";
import { Badge, Spinner } from "../../components/ui/Bits";
import { configureTts } from "../../lib/tts";

export function useDesktopTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("portal-desktop");
    html.classList.remove("hc", "text-xl-mode");
    configureTts({ enabled: true, rate: 1 });
    return () => html.classList.remove("portal-desktop");
  }, []);
}

export function SideShell({ title, nav, children, banner }: { title: string; nav: { to: string; label: string; end?: boolean }[]; children: React.ReactNode; banner?: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="portal-shell min-h-screen md:flex">
      <aside className={`portal-sidebar md:w-64 md:min-h-screen bg-surface border-r border-line md:block ${open ? "block" : "hidden"} md:sticky md:top-0`}>
        <div className="p-5 flex items-center gap-3 border-b border-line">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-bold text-lg leading-tight">{t("appName")}</p>
            <p className="text-sm text-muted">{title}</p>
          </div>
        </div>
        <nav className="p-3 flex flex-col gap-1" aria-label={title}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `min-h-12 px-4 rounded-xl flex items-center font-semibold ${isActive ? "bg-primary text-on-primary" : "hover:bg-soft"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 mt-4 border-t border-line flex flex-col gap-2">
          <p className="text-sm text-muted px-2">{profile?.name}</p>
          <button onClick={() => setLang(lang === "ml" ? "en" : "ml")} className="min-h-12 rounded-xl bg-soft font-semibold">🌐 {lang === "ml" ? "English" : "മലയാളം"}</button>
          <button onClick={() => void signOut()} className="min-h-12 rounded-xl border-2 border-line font-semibold">{t("logout")}</button>
        </div>
      </aside>
      <div className="portal-body flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-3 bg-surface border-b border-line sticky top-0 z-30">
          <span className="font-bold">{t("appName")} · {title}</span>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="min-h-12 min-w-12 rounded-xl bg-soft text-xl">☰</button>
        </div>
        {banner}
        <main className="portal-main p-4 md:p-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}

export default function FamilyLayout() {
  useDesktopTheme();
  const { t } = useI18n();
  const { links } = useFamilyLinks();
  const [sos, setSos] = useState<{ ev: SosEvent; name: string } | null>(null);
  const { lang } = useI18n();
  const activeIds = links.filter((l) => l.link.status === "active").map((l) => l.link.user_id);

  // Realtime SOS from any linked user (RLS only delivers rows we may read).
  useRealtime<SosEvent>("sos_events", (p) => {
    if (p.eventType !== "INSERT") return;
    const ev = p.new as SosEvent;
    if (!activeIds.includes(ev.user_id)) return;
    const name = links.find((l) => l.link.user_id === ev.user_id)?.profile?.name ?? "";
    setSos({ ev, name });
    const body = t("alertSos", { name, time: fmtTime(ev.created_at, lang) });
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("🆘 Sa Hai SOS", { body, requireInteraction: true, icon: "/icon-192.png" }); } catch { /* ignore */ }
    }
  }, { event: "INSERT", enabled: activeIds.length > 0 });

  const nav = [
    { to: "/family", label: t("famAllUsers"), end: true },
    { to: "/family/alerts", label: t("famAlerts") },
    { to: "/family/link", label: t("famLinkUser") },
    ...links.filter((l) => l.link.status === "active").map((l) => ({ to: `/family/u/${l.link.user_id}`, label: `👤 ${l.profile?.name ?? "…"}` })),
  ];
  const banner = sos && (
    <div role="alert" className="bg-danger text-on-danger p-4 flex flex-wrap items-center gap-3 font-bold text-lg">
      <span className="flex-1">{t("alertSos", { name: sos.name, time: fmtTime(sos.ev.created_at, lang) })}</span>
      {sos.ev.lat != null && sos.ev.lng != null && (
        <a href={mapsLink(sos.ev.lat, sos.ev.lng)} target="_blank" rel="noreferrer" className="bg-white text-danger rounded-xl px-4 py-2">{t("openMap")}</a>
      )}
      <button onClick={() => setSos(null)} className="border-2 border-white rounded-xl px-4 py-2">{t("close")}</button>
    </div>
  );
  return (
    <SideShell title={t("famTitle")} nav={nav} banner={banner}>
      <Outlet />
    </SideShell>
  );
}

/** /family/u/:userId — resolves the link level and shows the per-user sub-nav. */
export function FamilyUserScope() {
  const { userId } = useParams();
  const { links, loaded } = useFamilyLinks();
  const { t } = useI18n();
  if (!loaded) return <Spinner />;
  const l = links.find((x) => x.link.user_id === userId && x.link.status === "active");
  if (!l) return <Navigate to="/family" replace />;
  const level = l.link.level;
  const base = `/family/u/${userId}`;
  const items = [
    { to: base, label: t("famDashboard"), end: true },
    ...(level === "full" ? [{ to: `${base}/customize`, label: t("famCustomize") }] : []),
    { to: `${base}/medicines`, label: t("famMedicines") },
    { to: `${base}/tasks`, label: t("famTasks") },
    { to: `${base}/contacts`, label: t("famContacts") },
    { to: `${base}/emergency`, label: t("famEmergency") },
    { to: `${base}/hearing`, label: t("famHearing") },
    { to: `${base}/wheelchair`, label: t("famWheelchair") },
    { to: `${base}/checkin`, label: t("famCheckinRule") },
    { to: `${base}/messages`, label: t("famMessages") },
  ];
  return (
    <FamilyScopeCtx.Provider value={{ userId: userId!, level, profile: l.profile, canAssist: level !== "view", canFull: level === "full" }}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">👤 {l.profile?.name}</h1>
        <Badge tone={level === "full" ? "success" : level === "assist" ? "warn" : "soft"}>{t("famLevel", { level: t(`level_${level}` as const) })}</Badge>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-2 mb-5" aria-label={l.profile?.name ?? ""}>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) =>
            `shrink-0 min-h-11 px-4 rounded-full flex items-center font-semibold border-2 ${isActive ? "bg-primary text-on-primary border-primary" : "bg-surface border-line"}`}>
            {i.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </FamilyScopeCtx.Provider>
  );
}
