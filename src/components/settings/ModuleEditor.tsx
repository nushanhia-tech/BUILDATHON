import { Icon, moduleIcon } from "../ui/Icon";
import { useState } from "react";
import type { ModuleRow, SubFeature } from "../../lib/types";
import { useI18n, pickLabel } from "../../lib/i18n";
import { MODULE_DESCRIPTIONS, orderedAll, isCustom } from "../../lib/modules";
import { VoiceInput } from "../ui/VoiceInput";
import { NEEDS_TO_MODULES } from "../../lib/modules";
import { speak } from "../../lib/tts";

export interface ModuleDraft {
  enabled_modules: string[];
  enabled_features: string[];
  module_order: string[];
  custom_labels?: Record<string, string>;
  custom_icons?: Record<string, string>;
}

/**
 * Module + sub-feature toggles with ↑/↓ reorder (no drag-only actions).
 * Shared by onboarding, user settings and the family remote-customise screen.
 */
export function ModuleEditor({
  modules,
  subFeatures,
  value,
  onChange,
  reorder = true,
  compact = false,
}: {
  modules: ModuleRow[];
  subFeatures: SubFeature[];
  value: ModuleDraft;
  onChange: (v: ModuleDraft) => void;
  reorder?: boolean;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const list = orderedAll(modules, value.module_order);
  const keys = list.map((m) => m.key);

  const toggleModule = (k: string, on: boolean) => {
    const enabled = on
      ? [...new Set([...value.enabled_modules, k])]
      : value.enabled_modules.filter((x) => x !== k);
    const order = value.module_order.includes(k)
      ? value.module_order
      : [...value.module_order, k];
    onChange({ ...value, enabled_modules: enabled, module_order: order });
  };
  const toggleFeature = (k: string, on: boolean) =>
    onChange({
      ...value,
      enabled_features: on
        ? [...new Set([...value.enabled_features, k])]
        : value.enabled_features.filter((x) => x !== k),
    });
  const move = (k: string, dir: -1 | 1) => {
    const order = [...keys];
    const i = order.indexOf(k),
      j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    onChange({ ...value, module_order: order });
  };

  const custom = (key: string, label: string, icon?: string) => (
    <details className="mt-2">
      <summary className="min-h-12 cursor-pointer text-primary">
        ✏️ {t("renameButton")}
      </summary>
      <div className="grid gap-2 p-2">
        <input
          aria-label={t("renameButton")}
          value={value.custom_labels?.[key] ?? ""}
          placeholder={label}
          maxLength={80}
          onChange={(e) =>
            onChange({
              ...value,
              custom_labels: { ...value.custom_labels, [key]: e.target.value },
            })
          }
        />
        <VoiceInput
          onSubmit={(text) =>
            onChange({
              ...value,
              custom_labels: {
                ...value.custom_labels,
                [key]: text.slice(0, 80),
              },
            })
          }
        />
        {icon && (
          <input
            aria-label={t("customIcon")}
            value={value.custom_icons?.[key] ?? ""}
            placeholder={icon}
            maxLength={16}
            onChange={(e) =>
              onChange({
                ...value,
                custom_icons: { ...value.custom_icons, [key]: e.target.value },
              })
            }
          />
        )}
        <button
          type="button"
          className="min-h-12 bg-soft rounded-xl"
          onClick={() =>
            onChange({
              ...value,
              custom_labels: { ...value.custom_labels, [key]: "" },
              custom_icons: { ...value.custom_icons, [key]: "" },
            })
          }
        >
          ↺ {t("resetName")}
        </button>
        <p className="text-sm text-muted">{t("saveBelow")}</p>
      </div>
    </details>
  );
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(
          ["simple", "vision", "hearing", "mobility", "all", "custom"] as const
        ).map((p) => (
          <button
            type="button"
            key={p}
            className="min-h-12 px-3 bg-soft rounded-full"
            onClick={() => {
              if (p === "custom") return;
              const enabled =
                p === "all"
                  ? keys
                  : NEEDS_TO_MODULES[p].filter((k) => keys.includes(k));
              onChange({
                ...value,
                enabled_modules: enabled,
                enabled_features: subFeatures
                  .filter(
                    (f) => enabled.includes(f.module_key) && f.enabled_globally,
                  )
                  .map((f) => f.key),
              });
            }}
          >
            {t(
              p === "all"
                ? "presetAll"
                : p === "custom"
                  ? "presetCustom"
                  : `mode_${p}`,
            )}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {list.map((m, idx) => {
          const on = value.enabled_modules.includes(m.key);
          const subs = subFeatures.filter(
            (f) => f.module_key === m.key && f.enabled_globally,
          );
          const label =
            value.custom_labels?.[m.key]?.trim() ||
            pickLabel(lang, m.label_ml, m.label_en);
          const desc =
            MODULE_DESCRIPTIONS[m.key]?.[lang] ??
            (isCustom(m.key) ? (m.link_url ?? "") : "");
          return (
            <li key={m.key} className={`card p-3 ${on ? "" : "opacity-75"}`}>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span
                  className="grid place-items-center w-11 h-11 rounded-xl shrink-0"
                  style={{ background: `${m.color}1a`, color: m.color }}
                  aria-hidden="true"
                >
                  {value.custom_icons?.[m.key] || (
                    <Icon name={moduleIcon(m.key, m.icon)} size={24} />
                  )}
                </span>
                <label className="flex items-center gap-2.5 cursor-pointer min-h-12 min-w-0">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggleModule(m.key, e.target.checked)}
                    className="w-6 h-6 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="font-semibold leading-snug">{label}</span>
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => speak(`${label}. ${desc}`, { force: true })}
                    aria-label={`${t("describe")}: ${label}`}
                    className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary"
                  >
                    <Icon name="speaker" size={20} />
                  </button>
                  {reorder && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => move(m.key, -1)}
                        aria-label={`${t("moveUp")}: ${label}`}
                        className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary disabled:opacity-30"
                      >
                        <Icon name="back" size={20} className="rotate-90" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === list.length - 1}
                        onClick={() => move(m.key, 1)}
                        aria-label={`${t("moveDown")}: ${label}`}
                        className="h-10 w-10 grid place-items-center rounded-xl bg-soft text-primary disabled:opacity-30"
                      >
                        <Icon name="back" size={20} className="-rotate-90" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!compact && desc && (
                <p className="text-sm text-muted mt-1.5 pl-14">{desc}</p>
              )}
              {custom(m.key, pickLabel(lang, m.label_ml, m.label_en), m.icon)}
              {subs.length > 0 && on && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(open === m.key ? null : m.key)}
                    aria-expanded={open === m.key}
                    className="mt-2 ml-14 min-h-9 px-3 rounded-full bg-soft text-primary font-semibold text-sm inline-flex items-center gap-1.5"
                  >
                    <Icon
                      name="back"
                      size={16}
                      className={open === m.key ? "rotate-90" : "-rotate-90"}
                    />
                    {open === m.key
                      ? t("collapse")
                      : `${t("subFeatures")} ${subs.filter((s) => value.enabled_features.includes(s.key)).length}/${subs.length}`}
                  </button>
                  {open === m.key && (
                    <ul className="mt-2 flex flex-col gap-1 pl-14">
                      {subs.map((f) => (
                        <li key={f.key}>
                          <label className="flex items-center gap-2.5 min-h-11 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-5 h-5"
                              checked={value.enabled_features.includes(f.key)}
                              onChange={(e) =>
                                toggleFeature(f.key, e.target.checked)
                              }
                            />
                            <span>
                              {value.custom_labels?.[f.key] ||
                                pickLabel(lang, f.label_ml, f.label_en)}
                            </span>
                          </label>
                          {custom(
                            f.key,
                            pickLabel(lang, f.label_ml, f.label_en),
                            "✦",
                          )}
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
    </div>
  );
}
