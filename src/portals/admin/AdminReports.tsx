import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { fmtDateTime } from "../../lib/time";
import { Badge, Empty, Spinner } from "../../components/ui/Bits";
import type { Report } from "../../lib/types";

export default function AdminReports() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<(Report & { reporterName?: string; ownerId?: string })[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    const rs = (data ?? []) as Report[];
    const ids = [...new Set(rs.map((r) => r.reporter_id))];
    const { data: ps } = ids.length ? await supabase.from("profiles").select("id,name").in("id", ids) : { data: [] };
    const wcIds = rs.filter((r) => r.item_type === "wheelchair").map((r) => r.item_id);
    const { data: ws } = wcIds.length ? await supabase.from("wheelchairs").select("id,owner_id").in("id", wcIds) : { data: [] };
    setRows(rs.map((r) => ({ ...r, reporterName: (ps ?? []).find((p) => p.id === r.reporter_id)?.name as string, ownerId: (ws ?? []).find((w) => w.id === r.item_id)?.owner_id as string })));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (r: Report & { ownerId?: string }, action: "warned" | "removed" | "blocked" | "dismissed") => {
    try {
      if (action === "removed" && r.item_type === "wheelchair") await supabase.from("wheelchairs").delete().eq("id", r.item_id);
      if (action === "blocked" && r.ownerId) await supabase.from("profiles").update({ blocked: true }).eq("id", r.ownerId);
      const { error } = await supabase.from("reports").update({ status: action }).eq("id", r.id);
      if (error) throw error;
      toast(t("saved"), "success"); void load();
    } catch (e) { toast(String(e), "error"); }
  };

  if (!rows) return <Spinner />;
  return (
    <div>
      <h1 className="text-[1.8rem] font-bold mb-4">{t("admReports")}</h1>
      {rows.length === 0 ? <Empty text={t("noReports")} icon="🚩" /> : (
        <ul className="flex flex-col gap-3 max-w-4xl">
          {rows.map((r) => (
            <li key={r.id} className="card p-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold flex-1">{t("itemType")}: {r.item_type} · <span className="text-sm text-muted">{r.item_id.slice(0, 8)}</span></span>
                <Badge tone={r.status === "open" ? "warn" : "soft"}>{r.status}</Badge>
              </div>
              <p>{t("reason")}: {r.reason}</p>
              <p className="text-sm text-muted">{t("reporter")}: {r.reporterName} · {fmtDateTime(r.created_at, lang)}</p>
              {r.status === "open" && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void act(r, "warned")} className="min-h-10 px-3 rounded-lg bg-soft">{t("warn")}</button>
                  <button onClick={() => void act(r, "removed")} className="min-h-10 px-3 rounded-lg bg-soft text-danger">{t("removeItem")}</button>
                  {r.ownerId && <button onClick={() => void act(r, "blocked")} className="min-h-10 px-3 rounded-lg bg-soft text-danger">{t("blockUser")}</button>}
                  <button onClick={() => void act(r, "dismissed")} className="min-h-10 px-3 rounded-lg bg-soft">{t("dismiss")}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
