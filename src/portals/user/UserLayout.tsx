import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { UserSettingsProvider, useUserSettings } from "../../hooks/useUserSettings";
import { useI18n, pickLabel } from "../../lib/i18n";
import { configureTts, speak } from "../../lib/tts";
import { vibrate } from "../../lib/stt";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { useToast } from "../../hooks/useToast";
import { useA11y } from "../../hooks/useA11y";
import { dosesFor, type Dose } from "../../lib/meds";
import { endOfDay, fmtDate, startOfDay, todayStr } from "../../lib/time";
import type { FamilyLink, LinkLevel, MedLog, Medicine, PublicProfile, UserSettings } from "../../lib/types";
import { FlashOverlay } from "../../components/ui/FlashOverlay";
import { NavIcon } from "../../components/ui/NavIcon";
import { Spinner } from "../../components/ui/Bits";

export default function UserLayout() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <UserSettingsProvider userId={profile.id}>
      <UserShell />
    </UserSettingsProvider>
  );
}

function ThemeSync({ s }: { s: UserSettings | null }) {
  const { setLang, lang } = useI18n();
  useEffect(() => {
    const html = document.documentElement;
    document.body.classList.add("user-bg");
    html.classList.remove("portal-desktop");
    html.classList.toggle("text-xl-mode", s?.text_size === "xl");
    html.classList.toggle("hc", Boolean(s?.high_contrast));
    configureTts({ enabled: s?.voice_on ?? true, rate: Number(s?.voice_rate ?? 0.9) });
    if (s?.language && s.language !== lang) setLang(s.language);
    return () => { html.classList.remove("text-xl-mode", "hc"); document.body.classList.remove("user-bg"); };
  }, [s, setLang, lang]);
  return null;
}

function UserShell() {
  const { settings, loaded, isOn } = useUserSettings();
  const { t } = useI18n();
  const loc = useLocation();
  if (!loaded) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (settings && !settings.onboarded && loc.pathname !== "/app/onboarding") return <Navigate to="/app/onboarding" replace />;
  const onboarding = loc.pathname === "/app/onboarding";

  const tabs = [
    { to: "/app", icon: <NavIcon name="home" />, label: t("navHome"), end: true },
    ...(isOn("family_sos") ? [{ to: "/app/family", icon: <NavIcon name="family" />, label: t("navFamily"), end: false }] : []),
    { to: "/app/settings", icon: <NavIcon name="settings" />, label: t("navSettings"), end: false },
  ];

  return (
    <div className="user-shell min-h-screen">
      <ThemeSync s={settings} />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-surface p-3 rounded-xl z-50">Skip</a>
      <div className="user-brand brand"><span className="brand-symbol" aria-hidden="true">✦</span> {t("appName") === "Nila" ? "Nila" : `${t("appName")} · Nila`}</div>
      <main id="main" className={`user-main mx-auto w-full px-4 pt-5 ${onboarding ? "pb-10" : "safe-bottom"}`}>
        <Outlet />
      </main>
      {!onboarding && (
        <nav aria-label="Main" className="user-navigation">
          <ul className="user-nav-list">
            {tabs.map((tab) => (
              <li key={tab.to} className="flex-1">
                <NavLink to={tab.to} end={tab.end} className={({ isActive }) =>
                  `min-h-20 flex flex-col items-center justify-center gap-0.5 font-semibold text-base ${isActive ? "text-primary" : "text-muted"}`}>
                  <span aria-hidden="true" className="text-2xl">{tab.icon}</span>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <MedicineReminder />
      <LinkApprovalPrompt />
      <SettingsChangeToast />
      <ReturnReminder />
    </div>
  );
}

/** While the app is open: check every 30 s for due doses and show a full-screen reminder. */
function MedicineReminder() {
  const { profile } = useAuth();
  const { isOn, features } = useUserSettings();
  const { t } = useI18n();
  const { hearing, voiceOn, vibrationOn } = useA11y();
  const toast = useToast();
  const enabled = isOn("medicines") && features("medicines").some((f) => f.key === "reminder");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<MedLog[]>([]);
  const [due, setDue] = useState<Dose | null>(null);
  const uid = profile!.id;

  const load = useCallback(async () => {
    if (!enabled) return;
    const [m, l] = await Promise.all([
      supabase.from("medicines").select("*").eq("user_id", uid).eq("active", true),
      supabase.from("med_logs").select("*").eq("user_id", uid)
        .gte("scheduled_for", startOfDay().toISOString()).lte("scheduled_for", endOfDay().toISOString()),
    ]);
    setMeds((m.data ?? []) as Medicine[]);
    setLogs((l.data ?? []) as MedLog[]);
  }, [enabled, uid]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("medicines", () => void load(), { filter: `user_id=eq.${uid}`, enabled });
  useRealtime("med_logs", () => void load(), { filter: `user_id=eq.${uid}`, enabled });

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      if (due) return;
      const d = dosesFor(meds, logs).find((x) => {
        if (x.status !== "due") return false;
        const key = `nila.rem.${x.medicine.id}.${todayStr()}.${x.time}`;
        const snoozed = Number(localStorage.getItem(key) || 0);
        return Date.now() > snoozed;
      });
      if (!d) return;
      setDue(d);
      const msg = t("medReminder", { name: d.medicine.name });
      if (voiceOn) speak(msg, { force: true });
      if (vibrationOn || hearing) vibrate([400, 150, 400, 150, 400]);
      if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        try { new Notification(t("medReminderTitle"), { body: msg, icon: "/icon-192.png", tag: d.medicine.id + d.time }); } catch { /* ignore */ }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [enabled, meds, logs, due, t, voiceOn, vibrationOn, hearing]);

  if (!due) return null;
  const key = `nila.rem.${due.medicine.id}.${todayStr()}.${due.time}`;
  const close = (snoozeMin: number) => { localStorage.setItem(key, String(Date.now() + snoozeMin * 60000)); setDue(null); };
  const take = async () => {
    const { error } = await supabase.from("med_logs").upsert(
      { medicine_id: due.medicine.id, user_id: uid, scheduled_for: due.scheduled.toISOString(), taken_at: new Date().toISOString() },
      { onConflict: "medicine_id,scheduled_for" });
    if (error) toast(error.message, "error"); else { toast(t("takenDone"), "success"); close(24 * 60); void load(); }
  };
  const msg = t("medReminder", { name: due.medicine.name });

  if (hearing) {
    return (
      <>
        <FlashOverlay open text={msg} sub={t("medReminderTitle")} persistent onClose={() => close(10)} />
        <div className="fixed bottom-6 inset-x-4 z-[960] grid grid-cols-2 gap-3">
          <button onClick={() => close(10)} className="min-h-20 rounded-3xl bg-white text-black font-bold text-xl">{t("snooze")}</button>
          <button onClick={take} className="min-h-20 rounded-3xl bg-success text-white font-bold text-xl">{t("taken")}</button>
        </div>
      </>
    );
  }
  return (
    <div role="alertdialog" aria-modal="true" aria-label={t("medReminderTitle")} className="fixed inset-0 z-[950] bg-primary text-on-primary flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-3xl font-bold">{t("medReminderTitle")}</p>
      {due.medicine.photo_url && <img src={due.medicine.photo_url} alt={due.medicine.name} className="w-48 h-48 object-cover rounded-3xl border-4 border-white" />}
      <p className="text-[2.2rem] font-extrabold leading-tight">{msg}</p>
      {due.medicine.notes && <p className="text-xl">{due.medicine.notes}</p>}
      <div className="w-full max-w-md flex flex-col gap-3">
        <button onClick={take} className="min-h-24 rounded-3xl bg-white text-primary font-extrabold text-2xl">{t("taken")}</button>
        <button onClick={() => close(10)} className="min-h-16 rounded-3xl border-2 border-white font-bold text-xl">{t("snooze")}</button>
      </div>
    </div>
  );
}

/** "{name} wants to see your information. Allow?" — user picks the level. */
function LinkApprovalPrompt() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [link, setLink] = useState<(FamilyLink & { fam?: PublicProfile }) | null>(null);
  const [level, setLevel] = useState<LinkLevel>("view");
  const uid = profile!.id;
  const spoken = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("family_links").select("*").eq("user_id", uid).eq("status", "pending").not("family_id", "is", null).order("created_at").limit(1);
    const l = (data?.[0] as FamilyLink) ?? null;
    if (!l) { setLink(null); return; }
    const { data: p } = await supabase.from("profiles_public").select("*").eq("id", l.family_id!).maybeSingle();
    setLink({ ...l, fam: (p as PublicProfile) ?? undefined });
  }, [uid]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("family_links", () => void load(), { filter: `user_id=eq.${uid}` });

  useEffect(() => {
    if (link && spoken.current !== link.id) { spoken.current = link.id; speak(t("linkRequest", { name: link.fam?.name ?? t("someone") })); }
  }, [link, t]);

  if (!link) return null;
  const answer = async (allow: boolean) => {
    const { error } = await supabase.from("family_links").update(allow ? { status: "active", level } : { status: "revoked" }).eq("id", link.id);
    if (error) toast(error.message, "error"); else toast(t("saved"), "success");
    void load();
  };
  const levels: LinkLevel[] = ["view", "assist", "full"];
  return (
    <div className="fixed inset-0 z-[900] bg-black/60 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="link-title">
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <p className="text-5xl text-center" aria-hidden="true">👨‍👩‍👧</p>
        <h2 id="link-title" className="text-[1.4rem] font-bold text-center">{t("linkRequest", { name: link.fam?.name ?? t("someone") })}</h2>
        <p className="font-semibold">{t("chooseLevel")}</p>
        <div role="radiogroup" className="flex flex-col gap-2">
          {levels.map((lv) => (
            <button key={lv} type="button" role="radio" aria-checked={level === lv} onClick={() => setLevel(lv)}
              className={`min-h-16 rounded-2xl p-3 text-left border-4 ${level === lv ? "border-primary bg-soft" : "border-line"}`}>
              <span className="block font-bold">{t(`level_${lv}` as const)}</span>
              <span className="block text-sm text-muted">{t(`levelDesc_${lv}` as const)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => answer(false)} className="min-h-20 rounded-3xl bg-soft font-bold text-xl border-2 border-line">{t("deny")}</button>
          <button onClick={() => answer(true)} className="min-h-20 rounded-3xl bg-primary text-on-primary font-bold text-xl">{t("allow")}</button>
        </div>
      </div>
    </div>
  );
}

/** Toast when a family member changes this user's settings (arrives via Realtime). */
function SettingsChangeToast() {
  const { lastChange, modules } = useUserSettings();
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const { hearing } = useA11y();
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!lastChange) return;
    const { prev, next } = lastChange;
    if (!next.updated_by || next.updated_by === profile?.id || seen.current === next.updated_at) return;
    seen.current = next.updated_at;
    void (async () => {
      const { data } = await supabase.from("profiles_public").select("name").eq("id", next.updated_by!).maybeSingle();
      const who = (data?.name as string) || t("someone");
      const label = (k: string) => { const m = modules.find((x) => x.key === k); return m ? pickLabel(lang, m.label_ml, m.label_en) : k; };
      const added = next.enabled_modules.filter((k) => !prev?.enabled_modules.includes(k));
      const removed = (prev?.enabled_modules ?? []).filter((k) => !next.enabled_modules.includes(k));
      const msgs = [
        ...added.map((k) => t("changedBy", { who, what: label(k) })),
        ...removed.map((k) => t("removedBy", { who, what: label(k) })),
      ];
      if (!msgs.length) msgs.push(t("settingsChangedBy", { who }));
      msgs.forEach((m) => toast(m, "info"));
      speak(msgs[0]);
      if (hearing) vibrate(200);
    })();
  }, [lastChange, profile, modules, t, lang, toast, hearing]);
  return null;
}

/** Once a day: remind the seeker of upcoming wheelchair return dates. */
function ReturnReminder() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  useEffect(() => {
    const key = `nila.return.${todayStr()}`;
    if (localStorage.getItem(key)) return;
    void (async () => {
      const soon = new Date(); soon.setDate(soon.getDate() + 2);
      const { data } = await supabase.from("wheelchair_requests").select("return_date")
        .eq("seeker_id", profile!.id).eq("status", "accepted").lte("return_date", todayStr(soon));
      if (data?.length) {
        localStorage.setItem(key, "1");
        data.forEach((r) => toast(t("returnSoon", { date: fmtDate(r.return_date as string, lang) })));
      }
    })();
  }, [profile, t, lang, toast]);
  return null;
}
