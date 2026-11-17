import type { UserSettings } from "../../lib/types";
import { useI18n } from "../../lib/i18n";
import { Toggle } from "../ui/Bits";
import { vibrationSupported } from "../../lib/stt";

export type DisplayDraft = Pick<UserSettings, "text_size" | "high_contrast" | "voice_on" | "voice_rate" | "vibration" | "language">;

export function DisplayEditor({ value, onChange }: { value: DisplayDraft; onChange: (v: DisplayDraft) => void }) {
  const { t } = useI18n();
  const set = <K extends keyof DisplayDraft>(k: K, v: DisplayDraft[K]) => onChange({ ...value, [k]: v });
  const choice = (active: boolean) => `min-h-16 rounded-2xl font-bold border-4 ${active ? "border-primary bg-soft text-primary" : "border-line bg-surface"}`;
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="card p-4">
        <legend className="font-bold px-1">{t("textSize")}</legend>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button type="button" aria-pressed={value.text_size === "large"} onClick={() => set("text_size", "large")} className={choice(value.text_size === "large")}>
            <span className="text-xl">അ A</span> · {t("textLarge")}
          </button>
          <button type="button" aria-pressed={value.text_size === "xl"} onClick={() => set("text_size", "xl")} className={choice(value.text_size === "xl")}>
            <span className="text-2xl">അ A</span> · {t("textXL")}
          </button>
        </div>
      </fieldset>
      <fieldset className="card p-4">
        <legend className="font-bold px-1">{t("language")}</legend>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button type="button" aria-pressed={value.language === "ml"} onClick={() => set("language", "ml")} className={choice(value.language === "ml")}>മലയാളം</button>
          <button type="button" aria-pressed={value.language === "en"} onClick={() => set("language", "en")} className={choice(value.language === "en")}>English</button>
        </div>
      </fieldset>
      <div className="card p-4 flex flex-col divide-y divide-line">
        <Toggle label={t("highContrast")} checked={value.high_contrast} onChange={(v) => set("high_contrast", v)} />
        <Toggle label={t("voiceOn")} checked={value.voice_on} onChange={(v) => set("voice_on", v)} />
        {value.voice_on && (
          <label className="flex flex-col gap-2 py-3">
            <span className="font-semibold">{t("voiceRate")}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm">{t("slow")}</span>
              <input type="range" min={0.5} max={1.5} step={0.1} value={value.voice_rate} onChange={(e) => set("voice_rate", Number(e.target.value))} aria-label={t("voiceRate")} />
              <span className="text-sm">{t("fast")}</span>
            </div>
          </label>
        )}
        <Toggle label={t("vibrationSetting")} sub={vibrationSupported ? undefined : t("noVibration")} checked={value.vibration} onChange={(v) => set("vibration", v)} />
      </div>
    </div>
  );
}
