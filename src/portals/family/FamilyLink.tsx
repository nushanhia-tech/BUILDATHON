import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";

export default function FamilyLink() {
  const { t } = useI18n();
  const toast = useToast();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_link_code", { code });
    setBusy(false);
    if (error || !data) { toast(t("famLinkBad"), "error"); return; }
    toast(t("famLinkSent"), "success");
    nav("/family");
  };
  return (
    <div className="max-w-md flex flex-col gap-4">
      <h1 className="text-[1.8rem] font-bold">{t("famLinkTitle")}</h1>
      <p className="text-muted">{t("famLinkHelp")}</p>
      <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
          aria-label={t("famLinkTitle")} placeholder="••••••" className="text-center text-4xl tracking-[0.5em] font-bold !min-h-20" />
        <button disabled={code.length !== 6 || busy} className="min-h-16 rounded-2xl bg-primary text-on-primary font-bold text-xl disabled:opacity-50">{busy ? t("loading") : t("ok")}</button>
      </form>
    </div>
  );
}
