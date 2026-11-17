import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { PageHeader, Field } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { NEEDS, DISABILITIES, PANCHAYATS } from "./Survey";
interface Group {
  kind: string;
  label: string;
  count: string;
}
interface Summary {
  total: string;
  demo: boolean;
  living_alone_pct: number | null;
  without_caregiver_pct: number | null;
  without_certificate_pct: number | null;
  without_pension_pct: number | null;
  groups: Group[];
  signals: {
    wheelchair: string;
    help: { category: string; count: string }[];
    needs_posts: { category: string; count: string }[];
  };
}
export default function Government() {
  const { t } = useI18n();
  const [filters, setFilters] = useState({
      district: "",
      panchayat: "",
      ward: "",
      age: "",
      disability: "",
      need: "",
    }),
    [data, setData] = useState<Summary | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      void supabase.rpc("gov_summary", { filters }).then((r) => {
        if (active) {
          setError(r.error?.message || "");
          setData(r.data);
        }
      });
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [filters]);
  const label = (s: string) =>
    ["vision", "hearing", "mobility"].includes(s)
      ? t(`mode_${s}` as never)
      : [...NEEDS, ...DISABILITIES].includes(s as never)
        ? t(
            (s === "wheelchair"
              ? "wheelchair_need"
              : s === "other"
                ? "other_help"
                : s) as never,
          )
        : s;
  const csv = () => {
    if (!data) return;
    const escape = (s: string) =>
      '"' + (/^[=+@-]/.test(s) ? "\t" : "") + s.replace(/"/g, '""') + '"';
    const body = [
      ["kind", "label", "count"],
      ...data.groups.map((g) => [g.kind, g.label, g.count]),
      [t("generatedNila"), new Date().toISOString(), JSON.stringify(filters)],
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nila-aggregates.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="grid gap-5">
      <PageHeader title={t("govTitle")} help={t("privacyCounts")} icon="📊" />
      {error && <p role="alert">{error}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {(
          [
            "district",
            "panchayat",
            "ward",
            "age",
            "disability",
            "need",
          ] as const
        ).map((k, i) => (
          <Field
            key={k}
            label={t(
              (
                [
                  "district",
                  "panchayat",
                  "ward",
                  "ageGroup",
                  "disabilities",
                  "surveyNeeds",
                ] as const
              )[i],
            )}
          >
            {k === "district" || k === "ward" || k === "panchayat" ? (
              <input
                list={k === "panchayat" ? "nila-panchayats" : undefined}
                value={filters[k]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    [k]: e.target.value,
                    ...(k === "district"
                      ? { panchayat: "", ward: "" }
                      : k === "panchayat"
                        ? { ward: "" }
                        : {}),
                  })
                }
              />
            ) : (
              <select
                value={filters[k]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    [k]: e.target.value,
                  })
                }
              >
                <option value="">{t("all")}</option>
                {(k === "age"
                    ? ["<18", "18-40", "41-60", "61-75", "75+"]
                    : k === "disability"
                      ? DISABILITIES
                      : NEEDS
                ).map((o) => (
                  <option key={o} value={o}>
                    {label(o)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ))}
      </div>
      <datalist id="nila-panchayats">
        {[
          ...new Set([
            ...PANCHAYATS,
            ...(data?.groups
              .filter((g) => g.kind === "area")
              .map((g) => g.label.split(" / ")[1]) || []),
          ]),
        ].map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {data && (
        <>
          {data.demo && <p className="text-warn font-bold">{t("demoData")}</p>}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              data.total,
              data.living_alone_pct,
              data.without_caregiver_pct,
              data.without_certificate_pct,
              data.without_pension_pct,
            ].map((v, i) => (
              <div className="card p-4" key={i}>
                <p>
                  {t(
                    (
                      [
                        "surveyTotal",
                        "livingAlonePct",
                        "noCaregiverPct",
                        "noCertificatePct",
                        "noPensionPct",
                      ] as const
                    )[i],
                  )}
                </p>
                <strong className="text-3xl">{v ?? "—"}</strong>
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold">{t("topNeeds")}</h2>
          <p>
            {data.groups
              .filter((g) => g.kind === "need" && g.count !== "<5")
              .sort((a, b) => Number(b.count) - Number(a.count))
              .slice(0, 3)
              .map((g) => `${label(g.label)} (${g.count})`)
              .join(" · ") || "—"}
          </p>
          <div className="grid lg:grid-cols-3 gap-4">
            {["need", "disability", "age"].map((kind, i) => (
              <section className="card p-3 min-w-0" key={kind}>
                <h2>
                  {t((["surveyNeeds", "disabilities", "ageGroup"] as const)[i])}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.groups
                      .filter((g) => g.kind === kind)
                      .map((g) => ({
                        name: label(g.label),
                        value: g.count === "<5" ? null : Number(g.count),
                        display: g.count,
                      }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={90}
                      tick={{ fontSize: 14 }}
                    />
                    <Tooltip formatter={(_v, _n, p) => p.payload.display} />
                    <Bar dataKey="value" fill="#8951d5" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm">
                  {data.groups
                    .filter((g) => g.kind === kind && g.count === "<5")
                    .map((g) => `${label(g.label)}: <5`)
                    .join(" · ")}
                </p>
              </section>
            ))}
          </div>
          <h2 className="text-xl font-bold">{t("govReports")}</h2>
          <div className="overflow-x-auto">
            {(() => {
              const groups = data.groups.filter((g) => g.kind === "ward");
              const wards = [
                ...new Set(
                  groups.map((g) =>
                    g.label.split(" / ").slice(0, 3).join(" / "),
                  ),
                ),
              ];
              const needs = [
                ...new Set(groups.map((g) => g.label.split(" / ")[3])),
              ];
              return (
                <table className="w-full text-left">
                  <caption className="sr-only">{t("govReports")}</caption>
                  <thead>
                    <tr>
                      <th className="p-3">{t("ward")}</th>
                      {needs.map((n) => (
                        <th className="p-3" key={n}>
                          {label(n)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((w) => (
                      <tr key={w} className="border-b border-line">
                        <th className="p-3 font-normal">{w}</th>
                        {needs.map((n) => {
                          const count =
                            groups.find((g) => g.label === `${w} / ${n}`)
                              ?.count || "<5";
                          return (
                            <td
                              className="p-3 text-center"
                              key={n}
                              style={{
                                background:
                                  count === "<5"
                                    ? "transparent"
                                    : `rgba(137,81,213,${Math.min(0.65, Number(count) / 40)})`,
                              }}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
          <MapContainer
            center={[10.81, 76.19]}
            zoom={11}
            style={{ height: 320 }}
          >
            <TileLayer
              attribution="© OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {data.groups
              .filter((g) => g.kind === "area")
              .map((g) => {
                const i = PANCHAYATS.findIndex((p) => g.label.includes(p));
                return i < 0 ? null : (
                  <CircleMarker
                    key={g.label}
                    center={[
                      10.81 +
                        i * 0.025 +
                        Number(g.label.split(" / ")[2] || 0) * 0.002,
                      76.19 + i * 0.014,
                    ]}
                    radius={
                      g.count === "<5" ? 6 : Math.min(30, Number(g.count))
                    }
                    pathOptions={{ color: "#8951d5", fillOpacity: 0.35 }}
                  >
                    <Popup>
                      {g.label}: {g.count}
                    </Popup>
                  </CircleMarker>
                );
              })}
          </MapContainer>
          <p className="text-sm">{t("approximateMap")}</p>
          <section className="card p-4">
            <h2>{t("platformSignals")}</h2>
            <p>♿ {data.signals.wheelchair}</p>
            {[...data.signals.help, ...data.signals.needs_posts].map((g, i) => (
              <p key={i}>
                {label(g.category)}: {g.count}
              </p>
            ))}
          </section>
          <div className="flex flex-wrap gap-3">
            <BigButton label={t("exportCsv")} onClick={csv} />
            <BigButton
              variant="soft"
              label={t("exportPdf")}
              onClick={async () => {
                const { downloadPdf } = await import("./pdf");
                await downloadPdf(
                  t("govTitle"),
                  [
                    new Date().toLocaleString(),
                    JSON.stringify(filters),
                    ...data.groups.map(
                      (g) => `${g.kind}: ${label(g.label)} = ${g.count}`,
                    ),
                    t("generatedNila"),
                  ],
                  "nila-aggregates.pdf",
                );
              }}
            />
          </div>
          <p className="text-sm text-muted">
            {t("generatedNila")} · {new Date().toLocaleDateString()}
          </p>
        </>
      )}
    </div>
  );
}
