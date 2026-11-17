import { HomeExtras } from "../../phase2/Runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n, pickLabel } from "../../lib/i18n";
import { useA11y } from "../../hooks/useA11y";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useVoiceCommands } from "../../hooks/useVoiceCommands";
import { useRealtime } from "../../hooks/useRealtime";
import { supabase } from "../../lib/supabase";
import { dosesFor } from "../../lib/meds";
import { endOfDay, fmtTime, startOfDay } from "../../lib/time";
import { MODULE_ROUTES, customHref, isCustom } from "../../lib/modules";
import type { MedLog, Medicine, Task } from "../../lib/types";
import { BigButton } from "../../components/ui/BigButton";
import { ReadAloudButton } from "../../components/ui/ReadAloudButton";
import { Spinner } from "../../components/ui/Bits";
import { Icon, moduleIcon, splitLabel } from "../../components/ui/Icon";

export default function Home() {
  const { profile } = useAuth();
  const { visible, loaded, isOn, settings } = useUserSettings();
  const { t, lang } = useI18n();
  const { simple } = useA11y();
  const uid = profile!.id;
  const vc = useVoiceCommands(uid);
  const stt = useSpeechRecognition({
    lang: lang === "en" ? "en-IN" : "ml-IN",
    onFinal: (txt) => void vc.run(txt),
  });
  const [text, setText] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<MedLog[]>([]);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const medsOn = isOn("medicines");

  const load = async () => {
    if (medsOn) {
      const [m, l] = await Promise.all([
        supabase
          .from("medicines")
          .select("*")
          .eq("user_id", uid)
          .eq("active", true),
        supabase
          .from("med_logs")
          .select("*")
          .eq("user_id", uid)
          .gte("scheduled_for", startOfDay().toISOString())
          .lte("scheduled_for", endOfDay().toISOString()),
      ]);
      setMeds((m.data ?? []) as Medicine[]);
      setLogs((l.data ?? []) as MedLog[]);
    }
    if (isOn("tasks")) {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", uid)
        .eq("done", false)
        .eq("needs_confirmation", false)
        .gte("due_at", new Date().toISOString())
        .order("due_at")
        .limit(1);
      setNextTask(((data ?? [])[0] as Task) ?? null);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [medsOn, uid]);
  useRealtime("med_logs", () => void load(), {
    filter: `user_id=eq.${uid}`,
    enabled: medsOn,
  });

  const nextDose = useMemo(
    () =>
      dosesFor(meds, logs).find(
        (d) => d.status === "due" || d.status === "upcoming",
      ),
    [meds, logs],
  );
  const hour = new Date().getHours();
  const tod =
    hour < 12
      ? t("goodMorning")
      : hour < 17
        ? t("goodAfternoon")
        : t("goodEvening");
  const firstName = (profile?.name ?? "").split(" ")[0];

  if (!loaded) return <Spinner />;

  return (
    <div className="home-dashboard flex flex-col gap-5">
      {/* Greeting */}
      <header className="home-greeting flex items-start gap-3">
        <div className="flex-1">
          <p className="text-muted">{tod},</p>
          <h1 className="text-[1.35rem] font-bold leading-snug">
            {t("greeting", { name: firstName })}
          </h1>
          <p className="text-[1rem] text-primary font-semibold">
            {t("greetingSub")}
          </p>
        </div>
        <Link
          to="/app/settings"
          aria-label={t("navSettings")}
          className="shrink-0 w-12 h-12 rounded-full bg-soft grid place-items-center text-xl font-bold text-primary border-2 border-surface shadow"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            (firstName[0] ?? "🙂")
          )}
        </Link>
      </header>
      <ReadAloudButton
        text={[
          t("greeting", { name: firstName }),
          t("greetingSub"),
          t("homeHelp"),
        ]}
        className="self-start"
      />

      {/* Voice hero */}
      <section
        className="hero voice-hero p-5 flex flex-col gap-3 relative overflow-hidden"
        aria-label={t("speakAsk")}
      >
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/10"
        />
        <h2 className="text-[1.1rem] font-bold">
          {splitLabel(t("speakAsk")).text}
        </h2>
        {!simple && (
          <p className="opacity-90 text-[0.9rem]">{t("speakAskSub")}</p>
        )}
        {stt.supported ? (
          <button
            type="button"
            onClick={() => (stt.listening ? stt.stop() : stt.start())}
            aria-pressed={stt.listening}
            className={`self-start min-h-12 px-5 rounded-full font-semibold inline-flex items-center gap-2 shadow ${stt.listening ? "bg-danger text-white animate-pulse" : "bg-white text-primary"}`}
          >
            <Icon name={stt.listening ? "stop" : "mic"} size={20} />
            {stt.listening ? t("listening") : t("tapToSpeak")}
          </button>
        ) : (
          <p className="text-sm bg-white/15 rounded-2xl p-3">{t("noStt")}</p>
        )}
        {stt.interim && (
          <p className="italic text-lg" aria-live="polite">
            {stt.interim}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) {
              void vc.run(text.trim());
              setText("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("typeHere")}
            aria-label={t("typeHere")}
            className="!border-white/40 !bg-white/95 !text-[#0f1d3a]"
          />
          <button
            type="submit"
            aria-label={t("send")}
            className="min-h-12 min-w-12 rounded-2xl bg-white text-primary grid place-items-center"
          >
            <Icon name="send" size={22} />
          </button>
        </form>
      </section>
      {vc.reply && (
        <div
          role="status"
          className="card p-4 border-l-4 border-primary text-[1.05rem] font-semibold flex gap-3 items-start"
        >
          <span className="text-primary">
            <Icon name="chat" size={22} />
          </span>
          <span className="flex-1">{vc.reply}</span>
          <button
            onClick={vc.clear}
            aria-label={t("close")}
            className="min-h-10 min-w-10 rounded-xl bg-soft grid place-items-center"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      )}

      {/* Next medicine banner */}
      {medsOn && nextDose && (
        <Link
          to="/app/medicines"
          className="card p-3.5 flex items-center gap-3 border-l-4 border-primary"
        >
          <span
            className="w-11 h-11 rounded-xl bg-soft text-primary grid place-items-center"
            aria-hidden="true"
          >
            <Icon name="pill" size={24} />
          </span>
          <span className="flex-1">
            <span className="block text-sm text-muted">
              {t("nextMedicine")}
            </span>
            <span className="block font-semibold">
              {t("nextMedAt", {
                name: nextDose.medicine.name,
                time: fmtTime(nextDose.scheduled, lang),
              })}
            </span>
          </span>
          <span aria-hidden="true" className="text-primary rotate-180">
            <Icon name="back" size={22} />
          </span>
        </Link>
      )}

      {/* Modules — data-driven */}
      <section
        aria-labelledby="svc"
        className={
          vc.unknown
            ? "services-section ring-4 ring-warn rounded-3xl p-2 -m-2"
            : "services-section"
        }
      >
        <h2 id="svc" className="text-[1.05rem] font-bold mb-3">
          {t("myServices")}
        </h2>
        {visible.length === 0 ? (
          <p className="card p-5 text-muted">{t("noModules")}</p>
        ) : (
          <div
            className={`service-grid grid gap-3 ${simple ? "grid-cols-1 is-simple" : "grid-cols-2"}`}
          >
            {visible.map((m) => {
              const label = pickLabel(lang, m.label_ml, m.label_en);
              const sub = lang === "ml" && !simple ? m.label_en : undefined;
              return (
                <BigButton
                  key={m.key}
                  variant="tile"
                  icon={
                    settings?.custom_icons?.[m.key] ? (
                      <span>{m.icon}</span>
                    ) : (
                      <Icon name={moduleIcon(m.key, m.icon)} size={26} />
                    )
                  }
                  accent={m.color}
                  label={label}
                  sub={sub}
                  className={
                    simple ? "text-[1.05rem]" : "text-[0.95rem]"
                  }
                  to={isCustom(m.key) ? undefined : MODULE_ROUTES[m.key]}
                  href={isCustom(m.key) ? customHref(m.link_url) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      <HomeExtras />
      {/* Upcoming task */}
      {!simple && nextTask && (
        <section>
          <h2 className="text-[1.05rem] font-bold mb-3">{t("todayTasks")}</h2>
          <Link to="/app/tasks" className="card p-3.5 flex items-center gap-3">
            <span
              className="w-11 h-11 rounded-xl bg-soft text-primary grid place-items-center"
              aria-hidden="true"
            >
              <Icon name="tasks" size={24} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{nextTask.title}</span>
              <span className="flex items-center gap-1 text-muted text-sm">
                <Icon name="clock" size={16} />
                {nextTask.due_at ? fmtTime(nextTask.due_at, lang) : ""}
              </span>
            </span>
          </Link>
        </section>
      )}
    </div>
  );
}
