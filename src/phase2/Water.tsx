import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { PageHeader, Field } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { useRows } from "./shared";
export interface WaterSettings {
  daily_goal_ml: number;
  glass_ml: number;
  start_time: string;
  end_time: string;
  interval_min: number;
}
export const defaultWater: WaterSettings = {
  daily_goal_ml: 2000,
  glass_ml: 250,
  start_time: "07:00",
  end_time: "21:00",
  interval_min: 90,
};
export default function Water({
  userId,
  canEdit = true,
}: {
  userId?: string;
  canEdit?: boolean;
}) {
  const options = useOptionalUserSettings();
  const { profile } = useAuth(),
    { t, lang } = useI18n(),
    toast = useToast(),
    uid = userId || profile!.id;
  const { rows, reload, error } = useRows<{
    id: string;
    amount_ml: number;
    created_at: string;
  }>("water_logs", uid);
  const [settings, setSettings] = useState(defaultWater),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase
      .from("water_settings")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle()
      .then((r) => {
        if (r.data) setSettings(r.data);
      });
  }, [uid]);
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return {
        date: d,
        amount: rows
          .filter(
            (r) => new Date(r.created_at).toDateString() === d.toDateString(),
          )
          .reduce((s, r) => s + r.amount_ml, 0),
      };
    }),
    total = days[6].amount;
  const add = async (amount: number) => {
    setBusy(true);
    const r = await supabase
      .from("water_logs")
      .insert({ user_id: uid, amount_ml: amount });
    setBusy(false);
    if (r.error) toast(r.error.message, "error");
    else void reload();
  };
  return (
    <div className="grid gap-4">
      <PageHeader title={t("waterTitle")} icon="💧" />
      <p className="card p-4 text-sm">{t("waterWarning")}</p>
      {error && <p role="alert">{error}</p>}
      <div className="card p-6 text-center">
        <div
          role="progressbar"
          aria-label={t("waterTitle")}
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={Math.max(total, settings.daily_goal_ml)}
          className="water-glass mx-auto"
        >
          <div
            style={{
              height: `${Math.min(100, (total / settings.daily_goal_ml) * 100)}%`,
            }}
          />
        </div>
        <h2 className="text-2xl font-bold mt-4">
          {t("waterProgress", { amount: total, goal: settings.daily_goal_ml })}
        </h2>
        <p>
          {Math.round((total / settings.glass_ml) * 10) / 10} /{" "}
          {Math.ceil(settings.daily_goal_ml / settings.glass_ml)} 💧
        </p>
      </div>
      {canEdit && (
        <>
          <BigButton
            disabled={busy}
            label={"💧 " + t("drinkGlass")}
            onClick={() => void add(settings.glass_ml)}
          />
          <div className="grid grid-cols-2 gap-2">
            <BigButton
              variant="soft"
              label={t("halfGlass")}
              onClick={() =>
                void add(Math.max(1, Math.round(settings.glass_ml / 2)))
              }
            />
            <BigButton
              variant="soft"
              label={t("fullBottle")}
              onClick={() => void add(500)}
            />
          </div>
          {rows[0] && (
            <BigButton
              variant="surface"
              label={t("undoWater")}
              onClick={async () => {
                const r = await supabase
                  .from("water_logs")
                  .delete()
                  .eq("id", rows[0].id);
                if (r.error) toast(r.error.message, "error");
                else void reload();
              }}
            />
          )}
        </>
      )}
      {(userId ||
        options?.features("water").some((f) => f.key === "water_week")) && (
        <section className="card p-4">
          <h2>{t("waterWeekly")}</h2>
          <div className="flex h-40 items-end gap-2">
            {days.map((d) => (
              <div
                className="flex-1 text-center text-xs"
                key={d.date.toISOString()}
              >
                <p>{d.amount}</p>
                <div
                  className="bg-primary rounded-t-lg mx-auto w-3/4"
                  style={{
                    height: Math.max(
                      2,
                      (d.amount /
                        Math.max(
                          settings.daily_goal_ml,
                          ...days.map((x) => x.amount),
                        )) *
                        100,
                    ),
                  }}
                />
                <span>
                  {d.date.toLocaleDateString(
                    lang === "ml" ? "ml-IN" : "en-IN",
                    { weekday: "short" },
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {canEdit && (
        <details className="card p-4">
          <summary>{t("settingsTitle")}</summary>
          <div className="grid gap-3 mt-3">
            {(
              [
                "daily_goal_ml",
                "glass_ml",
                "interval_min",
                "start_time",
                "end_time",
              ] as const
            ).map((k, i) => (
              <Field
                key={k}
                label={t(
                  (
                    [
                      "waterGoal",
                      "glassMl",
                      "intervalMin",
                      "waterStart",
                      "waterEnd",
                    ] as const
                  )[i],
                )}
              >
                <input
                  type={i < 3 ? "number" : "time"}
                  min={1}
                  value={settings[k]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [k]: i < 3 ? Number(e.target.value) : e.target.value,
                    })
                  }
                />
              </Field>
            ))}
            <BigButton
              label={t("save")}
              onClick={async () => {
                const r = await supabase
                  .from("water_settings")
                  .upsert({ ...settings, user_id: uid });
                toast(
                  r.error?.message || t("saved"),
                  r.error ? "error" : "success",
                );
              }}
            />
          </div>
        </details>
      )}
    </div>
  );
}
