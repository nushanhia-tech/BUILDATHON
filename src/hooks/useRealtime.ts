import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Evt = "*" | "INSERT" | "UPDATE" | "DELETE";

/**
 * Subscribe to Postgres changes on a table. RLS applies, so users only receive rows they may read.
 * Pass `enabled=false` to skip (e.g. while ids are loading).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtime<T extends { [key: string]: any } = { [key: string]: any }>(
  table: string,
  onChange: (p: RealtimePostgresChangesPayload<T>) => void,
  opts: { filter?: string; event?: Evt; enabled?: boolean } = {},
) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const { filter, event = "*", enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const name = `rt-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(name)
      .on("postgres_changes" as never, { event, schema: "public", table, ...(filter ? { filter } : {}) }, (p: RealtimePostgresChangesPayload<T>) => cb.current(p))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, filter, event, enabled]);
}
