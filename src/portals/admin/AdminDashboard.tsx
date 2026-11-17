import { useEffect, useState } from "react";
import { useI18n, pickLabel } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useCatalogue } from "../../hooks/useUserSettings";
import { Section, Spinner } from "../../components/ui/Bits";

interface Stats {
  users: number; family: number; by_mode: Record<string, number>; wc_available: number; wc_in_use: number; wc_pending: number;
  requests_today: number; sos_today: number; open_reports: number; module_usage: Record<string, number>;
}

export function BarChart({ rows, label }: { rows: { label: string; value: number; color?: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="card p-5" aria-label={label}>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
            <span className="truncate">{r.label}</span>
            <span className="h-6 rounded-full bg-soft overflow-hidden" aria-hidden="true">
              <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--primary)" }} />
            </span>
            <span className="font-bold text-right tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const { modules } = useCatalogue();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void supabase.rpc("admin_stats").then(({ data, error }) => (error ? setErr(error.message) : setS(data as Stats))); }, []);
  if (err) return <p className="card p-5 text-danger">{err}</p>;
  if (!s) return <Spinner />;
  const cards = [
    { label: t("statUsers"), value: s.users, icon: "🙋" },
    { label: t("statFamily"), value: s.family, icon: "👨‍👩‍👧" },
    { label: t("statWcAvailable"), value: s.wc_available, icon: "🟢" },
    { label: t("statWcInUse"), value: s.wc_in_use, icon: "🔴" },
    { label: t("statWcPending"), value: s.wc_pending, icon: "⏳" },
    { label: t("statRequestsToday"), value: s.requests_today, icon: "🙌" },
    { label: t("statSosToday"), value: s.sos_today, icon: "🆘" },
    { label: t("statReports"), value: s.open_reports, icon: "🚩" },
  ];
  return (
    <div>
      <h1 className="text-[1.8rem] font-bold mb-5">{t("admDashboard")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <p className="text-2xl" aria-hidden="true">{c.icon}</p>
            <p className="text-3xl font-bold tabular-nums">{c.value}</p>
            <p className="text-muted">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("moduleUsage")}>
          <BarChart label={t("moduleUsage")} rows={modules.map((m) => ({ label: `${m.icon} ${pickLabel(lang, m.label_ml, m.label_en)}`, value: s.module_usage[m.key] ?? 0, color: m.color }))} />
        </Section>
        <Section title={t("usersByMode")}>
          <BarChart label={t("usersByMode")} rows={(["vision", "hearing", "mobility", "simple"] as const).map((m) => ({ label: t(`mode_${m}`), value: s.by_mode[m] ?? 0 }))} />
        </Section>
      </div>
      <p className="text-muted text-sm mt-4">🔒 {t("medicalHidden")}</p>
    </div>
  );
}
