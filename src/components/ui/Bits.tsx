import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { ReadAloudButton } from "./ReadAloudButton";

/** User-portal screen header: back, title (≥28px), help text, read-aloud. */
export function PageHeader({ title, help, back = "/app", icon, extra }: { title: string; help?: string; back?: string | null; icon?: string; extra?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="flex flex-col gap-3 mb-5">
      <div className="flex items-center gap-3">
        {back !== null && (
          <Link to={back} aria-label={t("back")} className="min-h-16 min-w-16 grid place-items-center rounded-2xl card text-2xl font-bold">
            ←
          </Link>
        )}
        <h1 className="text-[1.6rem] font-bold leading-tight flex-1">
          {icon && <span aria-hidden="true" className="mr-2">{icon}</span>}
          {title}
        </h1>
      </div>
      {help && <p className="text-muted">{help}</p>}
      <div className="flex flex-wrap gap-2">
        <ReadAloudButton text={[title, help ?? ""]} />
        {extra}
      </div>
    </header>
  );
}

export function Tabs<T extends string>({ items, value, onChange, big = true }: {
  items: { key: T; label: string }[]; value: T; onChange: (k: T) => void; big?: boolean;
}) {
  return (
    <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          type="button"
          aria-selected={value === it.key}
          onClick={() => onChange(it.key)}
          className={`shrink-0 rounded-full px-5 font-bold border-2 ${big ? "min-h-16" : "min-h-12 text-base"} ${
            value === it.key ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-4 min-h-16 cursor-pointer ${disabled ? "opacity-50" : ""}`}>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative w-16 h-9 rounded-full bg-line peer-checked:bg-primary transition after:content-[''] after:absolute after:top-1 after:left-1 after:w-7 after:h-7 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-7 peer-focus-visible:ring-4 peer-focus-visible:ring-warn"
      />
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 p-4 text-muted" role="status">
      <span className="w-6 h-6 rounded-full border-4 border-line border-t-primary animate-spin" aria-hidden="true" />
      {label ?? t("loading")}
    </div>
  );
}

export function Empty({ text, icon = "🌙" }: { text?: string; icon?: string }) {
  const { t } = useI18n();
  return (
    <div className="card p-6 text-center text-muted flex flex-col items-center gap-2">
      <span className="text-4xl" aria-hidden="true">{icon}</span>
      {text ?? t("empty")}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 mb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[1.3rem] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "warn" | "success" | "danger" }) {
  const cls = { soft: "bg-soft text-primary", warn: "bg-amber-100 text-warn", success: "bg-green-100 text-success", danger: "bg-red-100 text-danger" }[tone];
  return <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold ${cls}`}>{children}</span>;
}

/** Bottom sheet / modal used for forms. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[800] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-surface w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 pb-8">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-[1.4rem] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="min-h-14 min-w-14 rounded-2xl bg-soft text-xl font-bold">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Big single-choice chips (accessible radiogroup). */
export function ChipGroup<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-semibold mb-1">{label}</legend>
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={`min-h-14 px-4 rounded-2xl font-semibold border-2 ${value === o.value ? "bg-primary text-on-primary border-primary" : "bg-surface border-line"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
