import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ml, type StringKey } from "../i18n/ml";
import { en } from "../i18n/en";
import type { Lang } from "./types";
import { configureTts } from "./tts";

const dict: Record<Lang, Record<StringKey, string>> = { ml, en };

export type TFn = (key: StringKey, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>) {
  let s = dict[lang][key] ?? dict.ml[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: TFn; }
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("nila.lang") as Lang) || "ml");
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("nila.lang", l);
    document.documentElement.lang = l;
    configureTts({ lang: l });
  }, []);
  const t = useCallback<TFn>((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

/** Pick the Malayalam or English label from a DB row. */
export function pickLabel(lang: Lang, mlText: string, enText?: string | null) {
  return lang === "en" && enText ? enText : mlText;
}
