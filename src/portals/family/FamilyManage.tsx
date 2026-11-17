import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useI18n, pickLabel } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { useSettingsFor } from "../../hooks/useUserSettings";
import { fmtDate, fmtDateTime, hhmm12 } from "../../lib/time";
import { PATTAMBI } from "../../lib/geo";
import { formatKm, haversineKm } from "../../lib/haversine";
import { MedicinesManager } from "../../components/managers/MedicinesManager";
import { MemoryNotes, TasksManager } from "../../components/managers/TasksManager";
import { ContactsManager, useContacts } from "../../components/managers/ContactsManager";
import { EmergencyCardView, EmergencyEditor, useEmergencyInfo } from "../../components/managers/EmergencyCard";
import { Badge, ChipGroup, Empty, Field, Section, Sheet, Spinner } from "../../components/ui/Bits";
import { BigButton } from "../../components/ui/BigButton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useFamilyScope } from "./familyData";
import type { Checkin, QuickPhrase, ReqReason, WheelchairPublic, WheelchairRequest } from "../../lib/types";
import { REASONS, TYPE_ICON, reqReason, reqStatus, wcOffer, wcStatus, wcType } from "../user/wheelchair/wcLabels";
import { Icon } from "../../components/ui/Icon";

/** /family/u/:userId/:section — manage one function of a linked user (permission-aware). */
export default function FamilyManage() {
  const { section } = useParams();
  const { t } = useI18n();
  const { userId, level, canFull } = useFamilyScope();
  const readOnly = level === "view" && <p className="card p-3 mb-4 text-muted"><Icon name="eye" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famReadOnly")}</p>;
  switch (section) {
    case "medicines": return <>{readOnly}<MedicinesManager userId={userId} actor="family" level={level} /></>;
    case "tasks": return (
      <>
        {readOnly}
        <TasksManager userId={userId} actor="family" level={level} />
        {canFull && <Section title={t("whereTab")}><MemoryNotes userId={userId} /></Section>}
      </>
    );
    case "contacts": return level === "view" ? <p className="card p-5 text-warn"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famReadOnly")}</p> : <ContactsManager userId={userId} actor="family" level={level} />;
    case "emergency": return <EmergencySection />;
    case "hearing": return <HearingSection />;
    case "wheelchair": return <WheelchairSection />;
    case "checkin": return <CheckinSection />;
    default: return <Navigate to={`/family/u/${userId}`} replace />;
  }
}

function EmergencySection() {
  const { t } = useI18n();
  const { userId, profile, canFull, level } = useFamilyScope();
  const { info, reload } = useEmergencyInfo(userId);
  const { contacts } = useContacts(userId);
  const [show, setShow] = useState(false);
  if (level === "view") return <p className="card p-5 text-warn"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famReadOnly")}</p>;
  if (info === undefined) return <Spinner />;
  return (
    <div className="max-w-xl flex flex-col gap-4">
      <BigButton variant="danger" label={t("showCard")} icon="🪪" onClick={() => setShow(true)} />
      {canFull ? <div className="card p-5"><EmergencyEditor userId={userId} initial={info} inline onSaved={reload} /></div>
        : <p className="card p-3 text-muted"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famNeedFull")}</p>}
      {show && <EmergencyCardView name={profile?.name ?? ""} info={info} contacts={contacts ?? []} onClose={() => setShow(false)} />}
    </div>
  );
}

function HearingSection() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { userId, canAssist, canFull } = useFamilyScope();
  const { settings, save } = useSettingsFor(userId);
  const [phrases, setPhrases] = useState<QuickPhrase[] | null>(null);
  const [ml, setMl] = useState("");
  const [en, setEn] = useState("");
  const [sens, setSens] = useState<number | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("quick_phrases").select("*").eq("user_id", userId).order("created_at");
    setPhrases((data ?? []) as QuickPhrase[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (settings) setSens(settings.sound_alert_sensitivity); }, [settings]);
  const add = async () => {
    if (!ml.trim()) return;
    const { error } = await supabase.from("quick_phrases").insert({ user_id: userId, text_ml: ml.trim(), text_en: en.trim() || null, icon: "💬" });
    if (error) toast(error.message, "error"); else { setMl(""); setEn(""); void load(); }
  };
  const remove = async (id: string) => { await supabase.from("quick_phrases").delete().eq("id", id); void load(); };
  return (
    <div className="max-w-2xl">
      <Section title={t("personalPhrases")}>
        {!phrases ? <Spinner /> : phrases.length === 0 ? <Empty icon="💬" /> : (
          <ul className="card divide-y divide-line">
            {phrases.map((p) => (
              <li key={p.id} className="p-3 flex items-center gap-3">
                <span className="flex-1">{pickLabel(lang, p.text_ml, p.text_en)}</span>
                {canAssist && <button onClick={() => void remove(p.id)} aria-label={t("delete")} className="min-h-11 min-w-11 rounded-xl bg-soft text-danger"><Icon name="trash" size={20} /></button>}
              </li>
            ))}
          </ul>
        )}
        {canAssist ? (
          <div className="card p-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <Field label={`${t("phraseText")} (ML)`}><input value={ml} onChange={(e) => setMl(e.target.value)} /></Field>
            <Field label={`${t("phraseText")} (EN)`}><input value={en} onChange={(e) => setEn(e.target.value)} /></Field>
            <button onClick={add} className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">{t("add")}</button>
          </div>
        ) : <p className="text-muted">{t("famReadOnly")}</p>}
      </Section>
      <Section title={t("sensitivity")}>
        {sens === null ? <Spinner /> : (
          <div className="card p-4 flex flex-col gap-3">
            <input type="range" min={0} max={100} value={sens} disabled={!canFull} onChange={(e) => setSens(Number(e.target.value))} aria-label={t("sensitivity")} />
            <p>{sens}</p>
            {canFull ? <button onClick={() => void save({ sound_alert_sensitivity: sens }).then(() => toast(t("savedLive"), "success"))} className="min-h-12 rounded-2xl bg-primary text-on-primary font-bold">{t("save")}</button>
              : <p className="text-muted"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famNeedFull")}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

function CheckinSection() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { userId, canFull } = useFamilyScope();
  const [deadline, setDeadline] = useState("12:00");
  const [history, setHistory] = useState<Checkin[]>([]);
  useEffect(() => {
    void supabase.from("checkin_rules").select("*").eq("user_id", userId).maybeSingle().then(({ data }) => data && setDeadline(data.deadline_time as string));
    void supabase.from("checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(14).then(({ data }) => setHistory((data ?? []) as Checkin[]));
  }, [userId]);
  const save = async () => {
    const { error } = await supabase.from("checkin_rules").upsert({ user_id: userId, deadline_time: deadline });
    if (error) toast(error.message, "error"); else toast(t("saved"), "success");
  };
  return (
    <div className="max-w-xl">
      <Section title={t("deadline")}>
        <div className="card p-4 flex gap-2 items-end">
          <Field label={`${t("deadline")} (${hhmm12(deadline, lang)})`}><input type="time" value={deadline} disabled={!canFull} onChange={(e) => setDeadline(e.target.value)} /></Field>
          {canFull && <button onClick={save} className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">{t("save")}</button>}
        </div>
        {!canFull && <p className="text-muted"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famNeedFull")}</p>}
      </Section>
      <Section title={t("checkinHistory")}>
        {history.length === 0 ? <Empty icon="💚" /> : <ul className="card divide-y divide-line">{history.map((c) => <li key={c.id} className="p-3"><Icon name="heart" size={18} className="inline-block align-[-0.25em] mr-1.5" />{fmtDateTime(c.created_at, lang)}</li>)}</ul>}
      </Section>
    </div>
  );
}

function WheelchairSection() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { userId, canFull } = useFamilyScope();
  const [list, setList] = useState<WheelchairPublic[] | null>(null);
  const [reqs, setReqs] = useState<WheelchairRequest[]>([]);
  const [target, setTarget] = useState<WheelchairPublic | null>(null);
  const [reason, setReason] = useState<ReqReason>("elderly");
  const [days, setDays] = useState("14");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const load = useCallback(async () => {
    const [w, r] = await Promise.all([
      supabase.from("wheelchairs_public").select("*").eq("status", "available"),
      supabase.from("wheelchair_requests").select("*").eq("seeker_id", userId).order("created_at", { ascending: false }),
    ]);
    setList((w.data ?? []) as WheelchairPublic[]);
    setReqs((r.data ?? []) as WheelchairRequest[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const send = async () => {
    setConfirm(false);
    const { error } = await supabase.from("wheelchair_requests").insert({ wheelchair_id: target!.id, seeker_id: userId, reason, days_needed: Number(days) || 7, message: message || null });
    if (error) toast(error.message, "error"); else { toast(t("requestSent"), "success"); setTarget(null); void load(); }
  };
  if (!list) return <Spinner />;
  return (
    <div>
      <Section title={t("wheelchairRequests")}>
        {reqs.length === 0 ? <Empty text={t("noRequests")} icon="♿" /> : (
          <ul className="card divide-y divide-line">{reqs.map((r) => <li key={r.id} className="p-3">{reqStatus(t, r.status)} · {reqReason(t, r.reason)} · {fmtDate(r.created_at, lang)}{r.return_date ? ` · ${t("returnBy", { date: fmtDate(r.return_date, lang) })}` : ""}</li>)}</ul>
        )}
      </Section>
      <Section title={t("requestOnBehalf")}>
        {!canFull ? <p className="card p-3 text-warn"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("famNeedFull")}</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((w) => (
              <li key={w.id} className="card p-4 flex flex-col gap-2">
                <p className="font-bold">{wcType(t, w.type)}</p>
                <p className="text-muted">{wcOffer(t, w.offer)} · 📍 {w.place_name} · {formatKm(haversineKm(PATTAMBI.lat, PATTAMBI.lng, w.public_lat, w.public_lng))} km</p>
                <div className="flex gap-1 flex-wrap"><Badge tone="success">{wcStatus(t, w.status)}</Badge>{w.is_demo && <Badge tone="warn">{t("demo")}</Badge>}</div>
                <button onClick={() => setTarget(w)} className="min-h-12 rounded-2xl bg-primary text-on-primary font-bold">{t("iNeedIt")}</button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Sheet open={Boolean(target)} title={t("requestOnBehalf")} onClose={() => setTarget(null)}>
        <div className="flex flex-col gap-4">
          <ChipGroup label={t("requestReason")} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: reqReason(t, r) }))} />
          <Field label={t("daysNeeded")}><input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
          <Field label={t("message")}><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
          <BigButton label={t("sendRequest")} onClick={() => setConfirm(true)} />
        </div>
      </Sheet>
      <ConfirmDialog open={confirm} body={`${t("sendRequest")}?`} onOk={send} onCancel={() => setConfirm(false)} />
    </div>
  );
}
