import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { useCatalogue, useSettingsFor } from "../../hooks/useUserSettings";
import { visibleModules } from "../../lib/modules";
import { errMsg, useToast } from "../../hooks/useToast";
import {
  ModuleEditor,
  type ModuleDraft,
} from "../../components/settings/ModuleEditor";
import {
  DisplayEditor,
  type DisplayDraft,
} from "../../components/settings/DisplayEditor";
import { HomePreview } from "../../components/settings/HomePreview";
import { Section, Spinner } from "../../components/ui/Bits";
import { useFamilyScope } from "./familyData";
import { Icon } from "../../components/ui/Icon";

/** Remote "എന്റെ App ക്രമീകരിക്കാം" with a live phone preview (full access only). */
export default function FamilyCustomize() {
  const { t } = useI18n();
  const toast = useToast();
  const { userId, profile, canFull } = useFamilyScope();
  const { modules, subFeatures, loaded } = useCatalogue();
  const { settings, save } = useSettingsFor(userId);
  const [draft, setDraft] = useState<ModuleDraft | null>(null);
  const [display, setDisplay] = useState<DisplayDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      enabled_modules: settings.enabled_modules,
      enabled_features: settings.enabled_features,
      custom_labels: settings.custom_labels ?? {},
      custom_icons: settings.custom_icons ?? {},
      module_order: settings.module_order,
    });
    setDisplay({
      text_size: settings.text_size,
      high_contrast: settings.high_contrast,
      voice_on: settings.voice_on,
      voice_rate: Number(settings.voice_rate),
      vibration: settings.vibration,
      language: settings.language,
    });
  }, [settings]);

  if (!canFull)
    return (
      <p className="card p-5 text-warn font-semibold">
        <Icon
          name="lock"
          size={18}
          className="inline-block align-[-0.25em] mr-1.5"
        />
        {t("famNeedFull")}
      </p>
    );
  if (!loaded || !draft || !display) return <Spinner />;

  const submit = async () => {
    setBusy(true);
    try {
      await save({ ...draft, ...display });
      toast(t("savedLive"), "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
      <div>
        <Section title={t("myModules")}>
          <ModuleEditor
            modules={modules}
            subFeatures={subFeatures}
            value={draft}
            onChange={setDraft}
            compact
          />
        </Section>
        <Section title={t("display")}>
          <DisplayEditor value={display} onChange={setDisplay} />
        </Section>
        <button
          disabled={busy}
          onClick={submit}
          className="w-full min-h-16 rounded-2xl bg-primary text-on-primary font-bold text-xl sticky bottom-3"
        >
          {busy ? t("loading") : t("saveChanges")}
        </button>
      </div>
      <aside className="lg:sticky lg:top-6">
        <h2 className="font-bold text-lg mb-3 text-center">
          <Icon
            name="phone"
            size={18}
            className="inline-block align-[-0.25em] mr-1.5"
          />
          {t("livePreview")}
        </h2>
        <HomePreview
          custom_labels={draft.custom_labels}
          custom_icons={draft.custom_icons}
          name={(profile?.name ?? "").split(" ")[0]}
          modules={visibleModules(modules, draft)}
          highContrast={display.high_contrast}
          xl={display.text_size === "xl"}
        />
      </aside>
    </div>
  );
}
