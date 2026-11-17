import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { NEEDS_TO_MODULES } from "../../lib/modules";
import {
  ModuleEditor,
  type ModuleDraft,
} from "../../components/settings/ModuleEditor";
import {
  DisplayEditor,
  type DisplayDraft,
} from "../../components/settings/DisplayEditor";
import { ReadAloudButton } from "../../components/ui/ReadAloudButton";
import { errMsg, useToast } from "../../hooks/useToast";
import { speak } from "../../lib/tts";
import type { Mode } from "../../lib/types";

export default function Onboarding() {
  const { t, setLang } = useI18n();
  const { profile, refreshProfile } = useAuth();
  const { settings, modules, subFeatures, save } = useUserSettings();
  const toast = useToast();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [needs, setNeeds] = useState<Mode[]>(profile?.modes ?? []);
  const [draft, setDraft] = useState<ModuleDraft>({
    custom_labels: settings?.custom_labels ?? {},
    custom_icons: settings?.custom_icons ?? {},
    enabled_modules: settings?.enabled_modules ?? [],
    enabled_features: settings?.enabled_features ?? [],
    module_order: settings?.module_order ?? [],
  });
  const [display, setDisplay] = useState<DisplayDraft>({
    text_size: settings?.text_size ?? "large",
    high_contrast: settings?.high_contrast ?? false,
    voice_on: settings?.voice_on ?? true,
    voice_rate: Number(settings?.voice_rate ?? 0.9),
    vibration: settings?.vibration ?? true,
    language: settings?.language ?? "ml",
  });
  const [busy, setBusy] = useState(false);

  const titles = [t("obNeedsTitle"), t("obModulesTitle"), t("obDisplayTitle")];
  const subs = [t("obNeedsSub"), t("obModulesSub"), t("obDisplaySub")];
  useEffect(() => {
    speak(
      `${titles[step - 1]}. ${subs[step - 1]}`,
    ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [step]);

  // Live-preview display choices while onboarding.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "text-xl-mode",
      display.text_size === "xl",
    );
    document.documentElement.classList.toggle("hc", display.high_contrast);
    setLang(display.language);
  }, [display, setLang]);

  const needCards: { key: Mode; icon: string; label: string }[] = [
    { key: "vision", icon: "👁️", label: t("needVision") },
    { key: "hearing", icon: "🦻", label: t("needHearing") },
    { key: "mobility", icon: "♿", label: t("needMobility") },
    { key: "simple", icon: "👴", label: t("needSimple") },
  ];

  const goModules = () => {
    if (needs.length) {
      const mods = [...new Set(needs.flatMap((n) => NEEDS_TO_MODULES[n]))];
      const feats = subFeatures
        .filter((f) => mods.includes(f.module_key))
        .map((f) => f.key);
      const order = [
        ...mods,
        ...modules.map((m) => m.key).filter((k) => !mods.includes(k)),
      ];
      setDraft({
        ...draft,
        enabled_modules: mods,
        enabled_features: [...new Set([...draft.enabled_features, ...feats])],
        module_order: order,
      });
    }
    if (needs.includes("hearing"))
      setDisplay((d) => ({ ...d, vibration: true }));
    if (needs.includes("vision"))
      setDisplay((d) => ({ ...d, text_size: "xl", voice_on: true }));
    setStep(2);
  };

  const finish = async (skip = false) => {
    setBusy(true);
    try {
      if (!skip) {
        await supabase
          .from("profiles")
          .update({ modes: needs })
          .eq("id", profile!.id);
        await save({ ...draft, ...display, onboarded: true });
        await refreshProfile();
      } else {
        await save({ onboarded: true });
      }
      nav("/app", { replace: true });
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-primary">{t("obStep", { n: step })}</p>
        <button
          type="button"
          onClick={() => finish(true)}
          className="min-h-12 px-4 rounded-full text-muted underline"
        >
          {t("obSkip")}
        </button>
      </div>
      <div
        className="h-3 rounded-full bg-line overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
      <h1 className="text-[1.8rem] font-bold leading-tight">
        {titles[step - 1]}
      </h1>
      <p className="text-muted -mt-3">{subs[step - 1]}</p>
      <ReadAloudButton
        text={[titles[step - 1], subs[step - 1]]}
        className="self-start"
      />

      {step === 1 && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          role="group"
          aria-label={titles[0]}
        >
          {needCards.map((c) => {
            const on = needs.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setNeeds(
                    on ? needs.filter((n) => n !== c.key) : [...needs, c.key],
                  )
                }
                className={`min-h-28 rounded-3xl p-4 flex items-center gap-4 text-left font-bold border-4 transition ${on ? "border-primary bg-soft" : "border-transparent card"}`}
              >
                <span className="text-5xl" aria-hidden="true">
                  {c.icon}
                </span>
                <span className="flex-1">{c.label}</span>
                <span
                  aria-hidden="true"
                  className={`w-10 h-10 rounded-full grid place-items-center text-xl ${on ? "bg-primary text-on-primary" : "bg-line"}`}
                >
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {step === 2 && (
        <ModuleEditor
          modules={modules}
          subFeatures={subFeatures}
          value={draft}
          onChange={setDraft}
        />
      )}
      {step === 3 && <DisplayEditor value={display} onChange={setDisplay} />}

      <div className="grid grid-cols-2 gap-3 sticky bottom-3">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className="min-h-20 rounded-3xl card font-bold text-xl disabled:opacity-40"
        >
          ← {t("back")}
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => (step === 1 ? goModules() : setStep(3))}
            className="min-h-20 rounded-3xl bg-primary text-on-primary font-bold text-xl"
          >
            {t("next")} →
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => finish()}
            className="min-h-20 rounded-3xl bg-success text-white font-bold text-xl"
          >
            ✔️ {t("obFinish")}
          </button>
        )}
      </div>
    </div>
  );
}
