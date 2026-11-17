import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/** id → display name map for "added by" labels. */
export function useNames(ids: (string | null | undefined)[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  useEffect(() => {
    if (!key) return;
    void supabase.from("profiles_public").select("id,name").in("id", key.split(",")).then(({ data }) => {
      setNames(Object.fromEntries(((data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])));
    });
  }, [key]);
  return names;
}
