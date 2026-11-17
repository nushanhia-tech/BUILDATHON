import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { ModuleRow, SubFeature, UserSettings } from "../lib/types";
import { visibleFeatures, visibleModules } from "../lib/modules";
import { useRealtime } from "./useRealtime";

/** Loads modules + sub_features (global catalogue) with live updates. */
export function useCatalogue() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [subFeatures, setSubFeatures] = useState<SubFeature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const [m, s] = await Promise.all([
      supabase.from("modules").select("*").order("default_order"),
      supabase.from("sub_features").select("*").order("id"),
    ]);
    setModules((m.data ?? []) as ModuleRow[]);
    setSubFeatures((s.data ?? []) as SubFeature[]);
    setLoaded(true);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtime("modules", () => void load());
  useRealtime("sub_features", () => void load());
  return { modules, subFeatures, loaded, reload: load };
}

/** Loads one user's settings (self, or a linked user for family) with live updates. */
export function useSettingsFor(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
    setSettings((data as UserSettings) ?? null);
    setLoaded(true);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useRealtime<UserSettings>("user_settings", (p) => {
    if (p.eventType !== "DELETE") setSettings(p.new as UserSettings);
  }, { filter: `user_id=eq.${userId}`, enabled: Boolean(userId) });

  const save = useCallback(async (patch: Partial<UserSettings>) => {
    if (!userId) return;
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("user_settings")
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setSettings(data as UserSettings);
  }, [userId]);

  return { settings, loaded, save, reload: load };
}

interface SettingsCtx {
  settings: UserSettings | null; modules: ModuleRow[]; subFeatures: SubFeature[]; loaded: boolean;
  visible: ModuleRow[]; features: (moduleKey: string) => SubFeature[]; isOn: (moduleKey: string) => boolean;
  save: (patch: Partial<UserSettings>) => Promise<void>;
  /** Previous settings snapshot, so Home can tell what a family member changed. */
  lastChange: { prev: UserSettings | null; next: UserSettings } | null;
}
const Ctx = createContext<SettingsCtx | null>(null);

export function UserSettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const cat = useCatalogue();
  const { settings, loaded, save } = useSettingsFor(userId);
  const [prev, setPrev] = useState<UserSettings | null>(null);
  const [lastChange, setLastChange] = useState<SettingsCtx["lastChange"]>(null);

  useEffect(() => {
    if (!settings) return;
    if (prev && prev.updated_at !== settings.updated_at) setLastChange({ prev, next: settings });
    setPrev(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const value = useMemo<SettingsCtx>(() => ({
    settings, modules: cat.modules, subFeatures: cat.subFeatures, loaded: loaded && cat.loaded,
    visible: visibleModules(cat.modules, settings),
    features: (k) => visibleFeatures(cat.subFeatures, settings, k),
    isOn: (k) => visibleModules(cat.modules, settings).some((m) => m.key === k),
    save, lastChange,
  }), [settings, cat.modules, cat.subFeatures, loaded, cat.loaded, save, lastChange]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUserSettings outside UserSettingsProvider");
  return c;
}

export function useOptionalUserSettings() { return useContext(Ctx); }
