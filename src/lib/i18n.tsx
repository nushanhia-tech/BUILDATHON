import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ml, type StringKey } from "../i18n/ml";
import { en } from "../i18n/en";
import type { Lang } from "./types";
import { configureTts } from "./tts";

const dict: Record<Lang, Record<StringKey, string>> = { ml, en };

export type TFn = (
  key: StringKey,
  vars?: Record<string, string | number>,
) => string;

export function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
) {
  let s = dict[lang][key] ?? dict.ml[key] ?? key;
  if (vars)
    for (const [k, v] of Object.entries(vars))
      s = s.split(`{${k}}`).join(String(v));
  return s;
}

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("nila.lang") as Lang) || "ml",
  );
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

/** User-specific labels also reach tab names and read-aloud text, without changing admin UI. */
export function LabelsProvider({
  settings,
  modules,
  features,
  children,
}: {
  settings: import("./types").UserSettings | null;
  modules: import("./types").ModuleRow[];
  features: import("./types").SubFeature[];
  children: ReactNode;
}) {
  const parent = useI18n();
  const aliases: Record<string, string> = {
    medicinesTitle: "medicines",
    tasksTitle: "tasks",
    visionTitle: "vision",
    hearingTitle: "hearing",
    wheelchairTitle: "wheelchair",
    familyTitle: "family_sos",
    galleryTitle: "family_gallery",
    waterTitle: "water",
    locationTitle: "location_safety",
    helpTitle: "volunteer_help",
    storiesTitle: "stories",
    surveyTitle: "needs_survey",
    tabTalk: "talk_bridge",
    tabAlert: "sound_alert",
    tabSigns: "sign_cards",
    tabOcr: "ocr",
    tabObjects: "objects",
    tabLight: "light",
  };
  const t: TFn = (key, vars) => {
    const lookup = aliases[key] || key;
    const row =
      modules.find((m) => m.key === lookup) ||
      features.find((f) => f.key === lookup);
    if (!row) return parent.t(key, vars);
    const label =
      settings?.custom_labels?.[lookup]?.trim() ||
      pickLabel(parent.lang, row.label_ml, row.label_en) ||
      parent.t(key, vars);
    const icon =
      !modules.some((m) => m.key === lookup) &&
      settings?.custom_icons?.[lookup];
    return icon ? `${icon} ${label}` : label;
  };
  return <Ctx.Provider value={{ ...parent, t }}>{children}</Ctx.Provider>;
}
