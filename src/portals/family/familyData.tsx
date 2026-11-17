import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { useRealtime } from "../../hooks/useRealtime";
import type { FamilyLink, LinkLevel, Profile } from "../../lib/types";

export interface LinkedUser { link: FamilyLink; profile: Profile | null; }

/** All of this family member's links (pending + active) with the linked user's profile. */
export function useFamilyLinks() {
  const { profile } = useAuth();
  const [links, setLinks] = useState<LinkedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const uid = profile?.id;
  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from("family_links").select("*").eq("family_id", uid).in("status", ["pending", "active"]).order("created_at");
    const ls = (data ?? []) as FamilyLink[];
    const ids = ls.map((l) => l.user_id);
    const { data: ps } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
    setLinks(ls.map((l) => ({ link: l, profile: ((ps ?? []) as Profile[]).find((p) => p.id === l.user_id) ?? null })));
    setLoaded(true);
  }, [uid]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("family_links", () => void load(), { filter: `family_id=eq.${uid}`, enabled: Boolean(uid) });
  return { links, loaded, reload: load };
}

interface ScopeCtx { userId: string; level: LinkLevel; profile: Profile | null; canAssist: boolean; canFull: boolean; }
export const FamilyScopeCtx = createContext<ScopeCtx | null>(null);
export function useFamilyScope() {
  const c = useContext(FamilyScopeCtx);
  if (!c) throw new Error("useFamilyScope outside scope");
  return c;
}
