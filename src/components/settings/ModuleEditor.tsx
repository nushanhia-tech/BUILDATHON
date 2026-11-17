import { useState } from "react";
import type { ModuleRow, SubFeature } from "../../lib/types";
import { useI18n, pickLabel } from "../../lib/i18n";
import { MODULE_DESCRIPTIONS, orderedAll, isCustom } from "../../lib/modules";
import { speak } from "../../lib/tts";
import { Icon, moduleIcon } from "../ui/Icon";

export interface ModuleDraft { enabled_modules: string[]; enabled_features: string[]; module_order: string[]; }

/**
 * Module + sub-feature toggles with ↑/↓ reorder (no drag-only actions).
 * Shared by onboarding, user settings and the family remote-customise screen.
 */
export function ModuleEditor({ modules, subFeatures, value, onChange, reorder = true, compact = false }: {
  modules: ModuleRow[]; subFeatures: SubFeature[]; value: ModuleDraft; onChange: (v: ModuleDraft) => void; reorder?: boolean; compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const list = orderedAll(modules, value.module_order);
  const keys = list.map((m) => m.key);

  const toggleModule = (k: string, on: boolean) => {
    const enabled = on ? [...new Set([...value.enabled_modules, k])] : value.enabled_modules.filter((x) => x !== k);
    const order = value.module_order.includes(k) ? value.module_order : [...value.module_order, k];
    onChange({ ...value, enabled_modules: enabled, module_order: order });
  };
  const toggleFeature = (k: string, on: boolean) =>
    onChange({ ...value, enabled_features: on ? [...new Set([...value.enabled_features, k])] : value.enabled_features.filter((x) => x !== k) });
  const move = (k: string, dir: -1 | 1) => {
    const order = [...keys];
    const i = order.indexOf(k), j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    onChange({ ...value, module_order: order });
  };

  return (
    <ul className="flex flex-col gap-3">
      {list.map((m, idx) => {
        const on = value.enabled_modules.includes(m.key);
        const subs = subFeatures.filter((f) => f.module_key === m.key && f.enabled_globally);
        const label = pickLabel(lang, m.label_ml, m.label_en);
        const desc = MODULE_DESCRIPTIONS[m.key]?.[lang] ?? (isCustom(m.key) ? m.link_url ?? "" : "");
        return (
          <li key={m.key} className={`card p-3 ${on ? "" : "opacity-75"}`}>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ background: `${m.color}1a`, color: m.color }} aria-hidden="true">
                <Icon name={moduleIcon(m.key, m.icon)} size={24} />
              </span>
              <label className="flex items-center gap-2.5 cursor-pointer min-h-12 min-w-0">
                <input type="checkbox" checked={on} onChange={(e) => toggleModule(m.key, e.target.checked)} className="w-6 h-6 shrink-0 accent-[var(--primary)]" />
                <span className="font-semibold leading-snug">{label}</span>
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => speak(`${label}. ${desc}`, { force: true })} aria-label={`${t("describe")}: ${label}`} className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary"><Icon name="speaker" size={20} /></button>
                {reorder && (
                  <>
                    <button type="button" disabled={idx === 0} onClick={() => move(m.key, -1)} aria-label={`${t("moveUp")}: ${label}`} className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary disabled:opacity-30"><Icon name="back" size={20} className="rotate-90" /></button>
                    <button type="button" disabled={idx === list.length - 1} onClick={() => move(m.key, 1)} aria-label={`${t("moveDown")}: ${label}`} className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary disabled:opacity-30"><Icon name="back" size={20} className="-rotate-90" /></button>
                  </>
                )}
              </div>
            </div>
            {!compact && desc && <p className="text-sm text-muted mt-1.5 pl-14">{desc}</p>}
            {subs.length > 0 && on && (
              <>
                <button type="button" onClick={() => setOpen(open === m.key ? null : m.key)} aria-expanded={open === m.key}
                  className="mt-2 ml-14 min-h-9 px-3 rounded-full bg-soft text-primary font-semibold text-sm inline-flex items-center gap-1.5">
                  <Icon name="back" size={16} className={open === m.key ? "rotate-90" : "-rotate-90"} />{open === m.key ? t("collapse") : `${t("subFeatures")} ${subs.filter((s) => value.enabled_features.includes(s.key)).length}/${subs.length}`}
                </button>
                {open === m.key && (
                  <ul className="mt-2 flex flex-col gap-1 pl-14">
                    {subs.map((f) => (
                      <li key={f.key}>
                        <label className="flex items-center gap-2.5 min-h-11 cursor-pointer">
                          <input type="checkbox" className="w-5 h-5" checked={value.enabled_features.includes(f.key)} onChange={(e) => toggleFeature(f.key, e.target.checked)} />
                          <span>{pickLabel(lang, f.label_ml, f.label_en)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
