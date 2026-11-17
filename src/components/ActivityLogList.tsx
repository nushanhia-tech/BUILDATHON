import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useI18n } from "../lib/i18n";
import { useRealtime } from "../hooks/useRealtime";
import { fmtDateTime } from "../lib/time";
import type { ActivityLog, PublicProfile } from "../lib/types";
import { Empty } from "./ui/Bits";

const ACTION_ICON: Record<string, string> = { insert: "➕", update: "✏️", delete: "🗑️", link: "🔗" };

/** "Who changed what, and when" for one user. */
export function ActivityLogList({ userId, limit = 30 }: { userId: string; limit?: number }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<(ActivityLog & { who?: string })[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("activity_log").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    const logs = (data ?? []) as ActivityLog[];
    const ids = [...new Set(logs.map((l) => l.changed_by).filter(Boolean))] as string[];
    const { data: ps } = ids.length ? await supabase.from("profiles_public").select("id,name").in("id", ids) : { data: [] };
    setRows(logs.map((l) => ({ ...l, who: ((ps ?? []) as PublicProfile[]).find((p) => p.id === l.changed_by)?.name })));
  }, [userId, limit]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("activity_log", () => void load(), { filter: `user_id=eq.${userId}` });
  if (!rows.length) return <Empty text={t("noActivity")} icon="🗒️" />;
  return (
    <ul className="card divide-y divide-line">
      {rows.map((r) => {
        const [op, table] = r.action.split(":");
        const d = r.details as { name?: string; added_modules?: string[]; removed_modules?: string[]; level?: string } | null;
        const extra = [
          d?.name,
          d?.added_modules?.length ? `+ ${d.added_modules.join(", ")}` : "",
          d?.removed_modules?.length ? `− ${d.removed_modules.join(", ")}` : "",
          op === "link" && d?.level ? d.level : "",
        ].filter(Boolean).join(" · ");
        return (
          <li key={r.id} className="p-3 flex gap-3">
            <span aria-hidden="true" className="text-xl">{ACTION_ICON[op] ?? "•"}</span>
            <span className="flex-1">
              <span className="block font-semibold">{r.who ?? "—"} · {op} {table}</span>
              {extra && <span className="block text-sm">{extra}</span>}
              <span className="block text-sm text-muted">{fmtDateTime(r.created_at, lang)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
