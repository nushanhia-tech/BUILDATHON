import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { speak } from "../../lib/tts";
import type { Contact, EmergencyInfo } from "../../lib/types";
import { Field, Sheet, Spinner } from "../ui/Bits";
import { BigButton } from "../ui/BigButton";
import { Icon } from "../ui/Icon";

export function useEmergencyInfo(userId: string) {
  const [info, setInfo] = useState<EmergencyInfo | null | undefined>(undefined);
  const load = useCallback(async () => {
    const { data } = await supabase.from("emergency_info").select("*").eq("user_id", userId).maybeSingle();
    setInfo((data as EmergencyInfo) ?? null);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  return { info, reload: load };
}

export function summaryText(name: string, info: EmergencyInfo | null, contacts: Contact[]) {
  const lines = [
    `SA HAI EMERGENCY CARD`,
    `പേര്/Name: ${name}`,
    info?.blood_group && `രക്തഗ്രൂപ്പ്/Blood: ${info.blood_group}`,
    info?.allergies && `അലർജി/Allergies: ${info.allergies}`,
    info?.conditions && `രോഗങ്ങൾ/Conditions: ${info.conditions}`,
    info?.doctor_name && `ഡോക്ടർ/Doctor: ${info.doctor_name} ${info.doctor_phone ?? ""}`,
    info?.note && `കുറിപ്പ്/Note: ${info.note}`,
    ...contacts.filter((c) => c.is_sos && !c.needs_confirmation).map((c) => `☎ ${c.name} (${c.relation ?? ""}): ${c.phone}`),
  ];
  return lines.filter(Boolean).join("\n");
}

/** Full-screen emergency card with a QR of a read-only text summary. */
export function EmergencyCardView({ name, info, contacts, onClose }: { name: string; info: EmergencyInfo | null; contacts: Contact[]; onClose: () => void }) {
  const { t } = useI18n();
  const [qr, setQr] = useState<string | null>(null);
  const text = summaryText(name, info, contacts);
  useEffect(() => { void QRCode.toDataURL(text, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr); }, [text]);
  const rows: [string, string | null | undefined][] = [
    [t("bloodGroup"), info?.blood_group], [t("allergies"), info?.allergies], [t("conditions"), info?.conditions],
    [t("doctor"), [info?.doctor_name, info?.doctor_phone].filter(Boolean).join(" · ")],
  ];
  return (
    <div role="dialog" aria-modal="true" aria-label={t("emergencyCard")} className="fixed inset-0 z-[900] bg-white text-black overflow-y-auto p-5">
      <div className="max-w-lg mx-auto flex flex-col gap-4">
        <div className="bg-red-600 text-white rounded-3xl p-5">
          <p className="text-lg font-semibold"><Icon name="idcard" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("emergencyCard")}</p>
          <p className="text-[2rem] font-extrabold">{name}</p>
          {info?.note && <p className="text-[1.6rem] font-bold mt-2 bg-white text-red-700 rounded-2xl p-3">{info.note}</p>}
        </div>
        <dl className="grid grid-cols-1 gap-2">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="border-2 border-gray-200 rounded-2xl p-3"><dt className="text-gray-600">{k}</dt><dd className="text-[1.4rem] font-bold">{v}</dd></div>
          ))}
        </dl>
        {contacts.filter((c) => c.is_sos && !c.needs_confirmation).map((c) => (
          <a key={c.id} href={`tel:${c.phone}`} className="min-h-16 rounded-2xl bg-green-700 text-white font-bold text-xl flex items-center justify-center"><Icon name="phone" size={18} className="inline-block align-[-0.25em] mr-1.5" />{c.name} · {c.phone}</a>
        ))}
        {qr && <figure className="flex flex-col items-center gap-2"><img src={qr} alt={t("qrHelp")} className="w-64 h-64" /><figcaption className="text-gray-600">{t("qrHelp")}</figcaption></figure>}
        <button onClick={() => speak(text.replace(/\n/g, ". "), { force: true })} className="min-h-16 rounded-2xl bg-gray-100 font-bold text-xl">{t("readThis")}</button>
        <button onClick={onClose} className="min-h-16 rounded-2xl bg-black text-white font-bold text-xl">{t("close")}</button>
      </div>
    </div>
  );
}

export function EmergencyEditor({ userId, initial, onSaved, inline = false, onClose }: { userId: string; initial: EmergencyInfo | null; onSaved: () => void; inline?: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [v, setV] = useState<Partial<EmergencyInfo>>(initial ?? {});
  const set = (k: keyof EmergencyInfo) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const save = async () => {
    const { error } = await supabase.from("emergency_info").upsert({ ...v, user_id: userId });
    if (error) toast(error.message, "error"); else { toast(t("saved"), "success"); onSaved(); }
  };
  const body = (
    <div className="flex flex-col gap-3">
      <Field label={t("bloodGroup")}><input value={v.blood_group ?? ""} onChange={set("blood_group")} placeholder="B+" /></Field>
      <Field label={t("allergies")}><input value={v.allergies ?? ""} onChange={set("allergies")} /></Field>
      <Field label={t("conditions")}><input value={v.conditions ?? ""} onChange={set("conditions")} /></Field>
      <Field label={t("doctor")}><input value={v.doctor_name ?? ""} onChange={set("doctor_name")} /></Field>
      <Field label={t("doctorPhone")}><input type="tel" value={v.doctor_phone ?? ""} onChange={set("doctor_phone")} /></Field>
      <Field label={t("cardNote")}><input value={v.note ?? ""} onChange={set("note")} placeholder="എനിക്ക് കേൾക്കില്ല" /></Field>
      <BigButton label={t("save")} icon="💾" onClick={save} />
    </div>
  );
  return inline ? body : <Sheet open title={t("editCard")} onClose={onClose ?? (() => {})}>{body}</Sheet>;
}

export function EmergencyLoading() { return <Spinner />; }
