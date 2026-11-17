import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// A placeholder client keeps the app renderable (it shows a setup notice) when env vars are missing.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Throw on Supabase error so callers can use try/catch + toast. */
export function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
