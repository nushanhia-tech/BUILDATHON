import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { getPosition, mapsLink, phoneDigits, waLink } from "../../lib/geo";
import { fmtTime, startOfDay } from "../../lib/time";
import { speak } from "../../lib/tts";
import { vibrate } from "../../lib/stt";
import { useToast } from "../../hooks/useToast";
import { PageHeader, Section, Spinner } from "../../components/ui/Bits";
import { BigButton } from "../../components/ui/BigButton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ContactsManager, useContacts } from "../../components/managers/ContactsManager";
import { EmergencyCardView, EmergencyEditor, useEmergencyInfo } from "../../components/managers/EmergencyCard";
import { MessageThread } from "../../components/managers/Messages";
import type { Checkin, Helpline } from "../../lib/types";
import { Icon } from "../../components/ui/Icon";

export default function FamilySos() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { features } = useUserSettings();
  const [params, setParams] = useSearchParams();
  const on = features("family_sos").map((f) => f.key);
  const uid = profile!.id;
  return (
    <div>
      <PageHeader title={t("familyTitle")} help={t("familyHelp")} icon="👨‍👩‍👧" />
      {on.includes("sos") && <SosBlock openInitially={params.get("sos") === "1"} onOpened={() => setParams({}, { replace: true })} />}
      {on.includes("checkin") && <CheckinBlock />}
      {on.includes("contacts") && (
        <Section title={t("contacts")}><ContactsManager userId={uid} actor="user" highlight={params.get("contact")} /></Section>
      )}
      {on.includes("emergency_card") && <EmergencyBlock />}
      <Section title={t("messages")}><MessageThread me={uid} big /></Section>
      <HelplinesBlock />
    </div>
  );
}

function SosBlock({ openInitially, onOpened }: { openInitially: boolean; onOpened: () => void }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const { contacts } = useContacts(profile!.id);
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState<{ link: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (openInitially) { setConfirm(true); onOpened(); } }, [openInitially, onOpened]);

  const send = async () => {
    setConfirm(false);
    setBusy(true);
    vibrate([200, 100, 200]);
    const pos = await getPosition(8000);
    const { error } = await supabase.from("sos_events").insert({ user_id: profile!.id, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
    setBusy(false);
    if (error) { toast(error.message, "error"); return; }
    setSent({ link: pos ? mapsLink(pos.lat, pos.lng) : null });
    speak(t("sosSent"), { force: true });
  };
  const msg = sent?.link ? t("sosMessage", { link: sent.link }) : t("sosMessageNoLoc");
  const sosContacts = (contacts ?? []).filter((c) => c.is_sos && !c.needs_confirmation);

  return (
    <section className="mb-6 flex flex-col gap-3" aria-label="SOS">
      <button type="button" disabled={busy} onClick={() => setConfirm(true)} aria-label={`${t("sos")} — ${t("sosBig")}`}
        className="sos-pulse w-full min-h-28 rounded-[1.75rem] bg-danger text-on-danger font-extrabold flex flex-col items-center justify-center gap-1 shadow-[0_16px_40px_rgba(220,38,38,.4)]">
        <span className="text-5xl" aria-hidden="true"><Icon name="sos" size={40} /></span>
        <span className="text-[1.5rem]">{busy ? t("loading") : t("sosBig")}</span>
      </button>
      <p className="card p-4 border-l-8 border-danger font-semibold" role="note"><Icon name="alert" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("notEmergency")}</p>
      <div className="grid grid-cols-2 gap-3">
        <BigButton variant="danger" label={t("call112")} href="tel:112" />
        <BigButton variant="danger" label={t("call108")} href="tel:108" />
      </div>
      {sent && (
        <div className="card p-4 flex flex-col gap-3 border-4 border-danger" role="alert">
          <p className="font-bold text-[1.2rem]"><Icon name="check" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("sosSent")}</p>
          <p className="text-muted">{msg}</p>
          {sosContacts.map((c) => (
            <div key={c.id} className="grid grid-cols-2 gap-2">
              {c.whatsapp && <BigButton variant="success" label={`${t("whatsapp")} · ${c.name}`} href={waLink(c.phone, msg)} />}
              <BigButton variant="surface" label={`${t("sms")} · ${c.name}`} href={`sms:${phoneDigits(c.phone)}?body=${encodeURIComponent(msg)}`} />
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={confirm} danger title={t("sos")} body={t("sosConfirm")} speakText={t("sosConfirm")} onOk={send} onCancel={() => setConfirm(false)} />
    </section>
  );
}

function CheckinBlock() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const [today, setToday] = useState<Checkin | null | undefined>(undefined);
  const load = useCallback(async () => {
    const { data } = await supabase.from("checkins").select("*").eq("user_id", profile!.id).gte("created_at", startOfDay().toISOString()).order("created_at", { ascending: false }).limit(1);
    setToday(((data ?? [])[0] as Checkin) ?? null);
  }, [profile]);
  useEffect(() => { void load(); }, [load]);
  const checkin = async () => {
    const { error } = await supabase.from("checkins").insert({ user_id: profile!.id });
    if (error) toast(error.message, "error"); else { speak(t("checkedIn")); void load(); }
  };
  if (today === undefined) return <Spinner />;
  return (
    <section className="mb-6 flex flex-col gap-2">
      <BigButton variant="success" label={t("imFine")} className="min-h-14 text-[1.05rem]" onClick={checkin} />
      {today && <p className="card p-3 text-success font-bold text-center" aria-live="polite">{t("checkedInAt", { time: fmtTime(today.created_at, lang) })}</p>}
    </section>
  );
}

function EmergencyBlock() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { info, reload } = useEmergencyInfo(profile!.id);
  const { contacts } = useContacts(profile!.id);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(false);
  if (info === undefined) return <Spinner />;
  return (
    <Section title={t("emergencyCard")}>
      <div className="grid grid-cols-2 gap-3">
        <BigButton variant="danger" label={t("showCard")} icon="🪪" onClick={() => setShow(true)} />
        <BigButton variant="surface" label={t("editCard")} icon="✏️" onClick={() => setEdit(true)} />
      </div>
      {show && <EmergencyCardView name={profile!.name} info={info} contacts={contacts ?? []} onClose={() => setShow(false)} />}
      {edit && <EmergencyEditor userId={profile!.id} initial={info} onSaved={() => { setEdit(false); void reload(); }} onClose={() => setEdit(false)} />}
    </Section>
  );
}

function HelplinesBlock() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Helpline[]>([]);
  useEffect(() => { void supabase.from("helplines").select("*").order("phone").then(({ data }) => setRows((data ?? []) as Helpline[])); }, []);
  if (!rows.length) return null;
  return (
    <Section title={t("helplines")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((h) => <BigButton key={h.id} variant="surface" label={`☎️ ${lang === "en" && h.name_en ? h.name_en : h.name_ml} · ${h.phone}`} href={`tel:${h.phone}`} />)}
      </div>
    </Section>
  );
}
