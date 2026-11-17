import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { fmtDate } from "../../lib/time";
import { Badge, Spinner } from "../../components/ui/Bits";
import type { Profile } from "../../lib/types";
import { Icon } from "../../components/ui/Icon";

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [q, setQ] = useState("");
  const load = useCallback(async () => {
    // Only non-medical profile columns are selected; medical tables are not readable by admins at all (RLS).
    const { data } = await supabase.from("profiles").select("id,name,role,modes,verified,blocked,created_at,phone,whatsapp,avatar_url,last_seen").order("created_at", { ascending: false });
    setRows((data ?? []) as Profile[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const setBlocked = async (p: Profile, blocked: boolean) => {
    const { error } = await supabase.from("profiles").update({ blocked }).eq("id", p.id);
    if (error) toast(error.message, "error"); else void load();
  };
  if (!rows) return <Spinner />;
  const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1 className="text-[1.8rem] font-bold mb-2">{t("admUsers")}</h1>
      <p className="text-muted mb-4"><Icon name="lock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("medicalHidden")}</p>
      <input className="!w-64 mb-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔎 ${t("search")}`} aria-label={t("search")} />
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-soft"><tr><th className="p-3">{t("name")}</th><th className="p-3">{t("role")}</th><th className="p-3">{t("modes")}</th><th className="p-3">{t("verified")}</th><th className="p-3">{t("created")}</th><th className="p-3">{t("actions")}</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className={`border-t border-line ${p.blocked ? "opacity-60" : ""}`}>
                <td className="p-3 font-semibold">{p.name} {p.blocked && <Badge tone="danger"><Icon name="block" size={20} /></Badge>}</td>
                <td className="p-3">{p.role}</td>
                <td className="p-3">{p.modes.map((m) => t(`mode_${m}` as const)).join(", ") || "—"}</td>
                <td className="p-3">{p.verified ? "✔️" : "—"}</td>
                <td className="p-3">{fmtDate(p.created_at, lang)}</td>
                <td className="p-3">{p.role !== "admin" && (
                  <button onClick={() => void setBlocked(p, !p.blocked)} className={`min-h-10 px-3 rounded-lg font-semibold ${p.blocked ? "bg-soft" : "bg-soft text-danger"}`}>{p.blocked ? t("unblock") : t("block")}</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
