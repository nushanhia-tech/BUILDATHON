import type { Mode, ModuleRow, SubFeature, UserSettings } from "./types";

export const CORE_MODULES = [
  "medicines",
  "tasks",
  "vision",
  "hearing",
  "wheelchair",
  "family_sos",
] as const;

/** Onboarding: needs → modules pre-checked. */
export const NEEDS_TO_MODULES: Record<Mode, string[]> = {
  vision: ["vision", "medicines", "family_sos", "volunteer_help", "stories"],
  hearing: ["hearing", "family_sos", "tasks", "stories"],
  mobility: ["wheelchair", "medicines", "family_sos", "volunteer_help"],
  simple: [
    "medicines",
    "tasks",
    "family_sos",
    "water",
    "family_gallery",
    "location_safety",
    "volunteer_help",
  ],
};

/** Route for each core module key. Custom modules (custom_*) open their link_url instead. */
export const MODULE_ROUTES: Record<string, string> = {
  medicines: "/app/medicines",
  tasks: "/app/tasks",
  vision: "/app/vision",
  hearing: "/app/hearing",
  wheelchair: "/app/wheelchair",
  family_sos: "/app/family",
  family_gallery: "/app/gallery",
  water: "/app/water",
  location_safety: "/app/location",
  volunteer_help: "/app/help",
  stories: "/app/stories",
  needs_survey: "/app/survey",
};

/** Short spoken descriptions used by the 🔊 button in onboarding/settings. */
export const MODULE_DESCRIPTIONS: Record<string, { ml: string; en: string }> = {
  family_gallery: {
    ml: "പ്രിയപ്പെട്ടവരെ ചിത്രവും ശബ്ദവും വഴി തിരിച്ചറിയാം.",
    en: "Recognise loved ones through photos and voices.",
  },
  water: {
    ml: "വെള്ളത്തിന്റെ അളവും ഓർമ്മപ്പെടുത്തലുകളും.",
    en: "Track water and choose reminders.",
  },
  location_safety: {
    ml: "സമ്മതത്തോടെ സ്ഥലം പങ്കിടാനും സുരക്ഷിത പരിധി നിശ്ചയിക്കാനും.",
    en: "Share your location with consent and define safe zones.",
  },
  volunteer_help: {
    ml: "അടുത്തുള്ള സൗജന്യ സഹായം ചോദിക്കാനും നൽകാനും.",
    en: "Ask for free help nearby.",
  },
  stories: {
    ml: "അനുഭവങ്ങൾ പങ്കിടാം.",
    en: "Share accessible stories and experiences.",
  },
  needs_survey: {
    ml: "സമൂഹ സഹായം ആസൂത്രണം ചെയ്യാനുള്ള ഐച്ഛിക സർവേ.",
    en: "Optional survey to plan community support.",
  },
  medicines: {
    ml: "മരുന്ന് കഴിക്കേണ്ട സമയം ഓർമ്മിപ്പിക്കും.",
    en: "Reminds you when to take medicines.",
  },
  tasks: {
    ml: "ചെയ്യാനുള്ള കാര്യങ്ങളും, സാധനങ്ങൾ എവിടെ വെച്ചു എന്നും ഓർത്തുവെക്കും.",
    en: "Remembers tasks and where you kept things.",
  },
  vision: {
    ml: "ക്യാമറ ഉപയോഗിച്ച് വായിച്ചുതരും, മുന്നിലുള്ളത് പറയും, വെളിച്ചം പറയും.",
    en: "Reads text, describes what's in front and checks light using the camera.",
  },
  hearing: {
    ml: "സംസാരം വലിയ അക്ഷരങ്ങളാക്കും, വലിയ ശബ്ദം വന്നാൽ മിന്നും.",
    en: "Turns speech into big text and flashes on loud sounds.",
  },
  wheelchair: {
    ml: "അടുത്തുള്ള വീൽചെയർ കണ്ടെത്താനും നൽകാനും.",
    en: "Find or give wheelchairs nearby.",
  },
  family_sos: {
    ml: "കുടുംബത്തെ വിളിക്കാനും, SOS അയക്കാനും.",
    en: "Call family and send SOS.",
  },
};

export function visibleModules(
  modules: ModuleRow[],
  s: Pick<UserSettings, "enabled_modules" | "module_order"> | null,
): ModuleRow[] {
  if (!s) return [];
  const order = s.module_order ?? [];
  return modules
    .filter((m) => m.enabled_globally && s.enabled_modules.includes(m.key))
    .sort((a, b) => {
      const ia = order.indexOf(a.key),
        ib = order.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.default_order - b.default_order;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
}

export function visibleFeatures(
  subs: SubFeature[],
  s: Pick<UserSettings, "enabled_features"> | null,
  moduleKey: string,
): SubFeature[] {
  if (!s) return [];
  return subs.filter(
    (f) =>
      f.module_key === moduleKey &&
      f.enabled_globally &&
      s.enabled_features.includes(f.key),
  );
}

/** Full ordered list of globally-enabled modules for the settings editor (user order first). */
export function orderedAll(modules: ModuleRow[], order: string[]): ModuleRow[] {
  return modules
    .filter((m) => m.enabled_globally)
    .sort((a, b) => {
      const ia = order.indexOf(a.key),
        ib = order.indexOf(b.key);
      return (
        (ia === -1 ? 999 + a.default_order : ia) -
        (ib === -1 ? 999 + b.default_order : ib)
      );
    });
}

export const isCustom = (key: string) => key.startsWith("custom_");

/** Turn a custom button's target into a link (phone numbers become tel:). */
export function customHref(target: string | null) {
  if (!target) return "#";
  const t = target.trim();
  if (/^\+?[\d\s-]{3,}$/.test(t)) return `tel:${t.replace(/[\s-]/g, "")}`;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
