import type { ModuleRow } from "../../lib/types";
import { useI18n, pickLabel } from "../../lib/i18n";
import { Icon, moduleIcon, splitLabel } from "../ui/Icon";

/** Phone-frame preview of a user's home screen (family remote-customise). */
export function HomePreview({ name, modules, highContrast, xl }: { name: string; modules: ModuleRow[]; highContrast: boolean; xl: boolean }) {
  const { t, lang } = useI18n();
  const bg = highContrast ? "#000" : "linear-gradient(180deg,#f4f8ff,#eef4ff)";
  const fg = highContrast ? "#ff0" : "#0f1d3a";
  return (
    <div className="mx-auto w-[300px] rounded-[2.5rem] border-[10px] border-[#111] shadow-2xl overflow-hidden" aria-label={t("livePreview")}>
      <div className="h-[560px] overflow-y-auto p-4 flex flex-col gap-3" style={{ background: bg, color: fg, fontSize: xl ? 17 : 14 }}>
        <div className="mx-auto w-24 h-5 rounded-full bg-[#111] -mt-2 mb-1" />
        <p className="opacity-70">{t("greetingSub")}</p>
        <p className="font-bold" style={{ fontSize: xl ? 24 : 20 }}>{t("greeting", { name })}</p>
        <div className="rounded-2xl p-3 font-bold" style={{ background: highContrast ? "#000" : "linear-gradient(135deg,#4f8cff,#1f56d6)", color: highContrast ? "#ff0" : "#fff", border: highContrast ? "2px solid #ff0" : "none" }}>
          {splitLabel(t("speakAsk")).text}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modules.map((m) => (
            <div key={m.key} className="rounded-2xl p-3 flex flex-col items-center gap-1 text-center" style={{ background: highContrast ? "#000" : "#fff", border: highContrast ? "2px solid #ff0" : "none", boxShadow: highContrast ? "none" : "0 6px 16px rgba(37,99,235,.08)" }}>
              <span aria-hidden="true" style={{ color: highContrast ? "#ff0" : m.color }}><Icon name={moduleIcon(m.key, m.icon)} size={28} /></span>
              <span className="font-semibold leading-tight">{pickLabel(lang, m.label_ml, m.label_en)}</span>
            </div>
          ))}
        </div>
        {modules.length === 0 && <p className="text-center opacity-70">{t("noModules")}</p>}
      </div>
    </div>
  );
}
