import { StockCard } from "../../phase2/Stock";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { useToast } from "../../hooks/useToast";
import { dosesFor, TIME_CHIPS, type Dose } from "../../lib/meds";
import { fmtTime, hhmm12, startOfDay, endOfDay, fmtDate } from "../../lib/time";
import { speak } from "../../lib/tts";
import type { LinkLevel, MedLog, Medicine } from "../../lib/types";
import { Badge, Empty, Field, Section, Sheet, Spinner } from "../ui/Bits";
import { BigButton } from "../ui/BigButton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PhotoUpload } from "../ui/PhotoUpload";
import { useNames } from "./useNames";

interface Props {
  userId: string;
  actor: "user" | "family";
  level?: LinkLevel;
  showHistory?: boolean;
}

/** Medicines for one user. The user marks doses; family (assist/full) can add, full can edit/delete. */
export function MedicinesManager({
  userId,
  actor,
  level = "full",
  showHistory = true,
}: Props) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [logs, setLogs] = useState<MedLog[]>([]);
  const [history, setHistory] = useState<MedLog[]>([]);
  const [edit, setEdit] = useState<Partial<Medicine> | null>(null);
  const [del, setDel] = useState<Medicine | null>(null);
  const canAdd = actor === "user" || level !== "view";
  const canEdit = actor === "user" || level === "full";

  const load = useCallback(async () => {
    const week = new Date();
    week.setDate(week.getDate() - 6);
    const [m, l, h] = await Promise.all([
      supabase
        .from("medicines")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
      supabase
        .from("med_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("scheduled_for", startOfDay().toISOString())
        .lte("scheduled_for", endOfDay().toISOString()),
      supabase
        .from("med_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("scheduled_for", startOfDay(week).toISOString()),
    ]);
    setMeds((m.data ?? []) as Medicine[]);
    setLogs((l.data ?? []) as MedLog[]);
    setHistory((h.data ?? []) as MedLog[]);
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime("medicines", () => void load(), {
    filter: `user_id=eq.${userId}`,
  });
  useRealtime("med_logs", () => void load(), {
    filter: `user_id=eq.${userId}`,
  });
  const names = useNames((meds ?? []).map((m) => m.added_by));

  const doses = useMemo(() => dosesFor(meds ?? [], logs), [meds, logs]);
  const pending = (meds ?? []).filter((m) => m.needs_confirmation);

  const take = async (d: Dose) => {
    const { error } = await supabase
      .from("med_logs")
      .upsert(
        {
          medicine_id: d.medicine.id,
          user_id: userId,
          scheduled_for: d.scheduled.toISOString(),
          taken_at: new Date().toISOString(),
        },
        { onConflict: "medicine_id,scheduled_for" },
      );
    if (error) toast(error.message, "error");
    else {
      toast(`${d.medicine.name} — ${t("takenDone")}`, "success");
      void load();
    }
  };
  const confirm = async (m: Medicine, ok: boolean) => {
    const { error } = ok
      ? await supabase
          .from("medicines")
          .update({ needs_confirmation: false })
          .eq("id", m.id)
      : await supabase.from("medicines").delete().eq("id", m.id);
    if (error) toast(error.message, "error");
    else void load();
  };
  const remove = async () => {
    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("id", del!.id);
    setDel(null);
    if (error) toast(error.message, "error");
    else void load();
  };

  if (!meds) return <Spinner />;
  const slots = [
    { key: "morning" as const, icon: "🌅", label: t("morning") },
    { key: "afternoon" as const, icon: "☀️", label: t("afternoon") },
    { key: "night" as const, icon: "🌙", label: t("night") },
  ];

  return (
    <div>
      {actor === "user" &&
        pending.map((m) => (
          <div
            key={m.id}
            className="card p-4 mb-4 border-l-8 border-warn flex flex-col gap-3"
            role="alert"
          >
            <p className="font-bold">
              {t("familyAddedMed", {
                who: names[m.added_by ?? ""] ?? t("someone"),
              })}
            </p>
            <p className="text-[1.3rem]">
              💊 {m.name} · {m.times.map((x) => hhmm12(x, lang)).join(", ")}
            </p>
            {m.notes && <p className="text-muted">{m.notes}</p>}
            <div className="grid grid-cols-2 gap-2">
              <BigButton
                variant="surface"
                label={t("rejectItem")}
                onClick={() => void confirm(m, false)}
              />
              <BigButton
                variant="success"
                label={t("confirmItem")}
                onClick={() => void confirm(m, true)}
              />
            </div>
          </div>
        ))}

      {canAdd && (
        <BigButton
          label={t("addMedicine")}
          className="w-full mb-5"
          onClick={() =>
            setEdit({ name: "", times: [], notes: "", photo_url: null })
          }
        />
      )}
      {actor === "family" && level === "assist" && (
        <p className="card p-3 mb-4 text-warn">ℹ️ {t("famAssistNote")}</p>
      )}

      <Section title={t("timeline")}>
        {doses.length === 0 ? (
          <Empty text={t("noMedicines")} icon="💊" />
        ) : (
          slots.map((s) => {
            const ds = doses.filter((d) => d.slot === s.key);
            if (!ds.length) return null;
            return (
              <div key={s.key} className="flex flex-col gap-2 mb-3">
                <h3 className="font-bold text-muted">
                  {s.icon} {s.label}
                </h3>
                {ds.map((d) => (
                  <div
                    key={d.medicine.id + d.time}
                    className={`card p-3 flex flex-col gap-3 ${d.status === "missed" ? "border-l-8 border-danger" : d.status === "due" ? "border-l-8 border-warn" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {d.medicine.photo_url ? (
                        <img
                          src={d.medicine.photo_url}
                          alt=""
                          className="w-16 h-16 rounded-2xl object-cover shrink-0"
                        />
                      ) : (
                        <span
                          className="w-16 h-16 rounded-2xl bg-soft grid place-items-center text-3xl shrink-0"
                          aria-hidden="true"
                        >
                          💊
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold break-words">
                          {d.medicine.name}
                        </p>
                        <p className="text-muted text-base">
                          🕒 {fmtTime(d.scheduled, lang)}
                          {d.medicine.notes ? ` · ${d.medicine.notes}` : ""}
                        </p>
                      </div>
                      {(d.taken || actor !== "user") &&
                        (d.taken ? (
                          <Badge tone="success">{t("takenDone")}</Badge>
                        ) : (
                          <Badge
                            tone={d.status === "missed" ? "danger" : "soft"}
                          >
                            {d.status === "missed"
                              ? t("missed")
                              : t("upcoming")}
                          </Badge>
                        ))}
                    </div>
                    {!d.taken && actor === "user" && (
                      <BigButton
                        variant={d.status === "upcoming" ? "soft" : "success"}
                        label={t("taken")}
                        onClick={() => void take(d)}
                        className="w-full"
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </Section>

      <Section title={t("medicinesTitle")}>
        <ul className="flex flex-col gap-2">
          {meds.map((m) => (
            <li key={m.id} className="card p-3 flex flex-col gap-2">
              <span>
                <span className="block font-bold break-words">
                  {m.name}{" "}
                  {m.needs_confirmation && (
                    <Badge tone="warn">{t("pendingApprovalBadge")}</Badge>
                  )}
                </span>
                <span className="block text-base text-muted">
                  {m.times.map((x) => hhmm12(x, lang)).join(" · ")}
                </span>
                {m.added_by && m.added_by !== userId && (
                  <span className="block text-sm text-muted">
                    + {names[m.added_by] ?? ""}
                  </span>
                )}
              </span>
              <StockCard medicine={m} canEdit={canEdit} onChanged={load} />
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speak(
                      `${m.name}. ${m.times.map((x) => hhmm12(x, lang)).join(", ")}. ${m.notes ?? ""}`,
                      { force: true },
                    )
                  }
                  aria-label={`${t("readAloud")}: ${m.name}`}
                  className="flex-1 min-h-14 rounded-2xl bg-soft"
                >
                  🔊
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEdit(m)}
                    aria-label={`${t("edit")}: ${m.name}`}
                    className="flex-1 min-h-14 rounded-2xl bg-soft"
                  >
                    ✏️
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setDel(m)}
                    aria-label={`${t("delete")}: ${m.name}`}
                    className="flex-1 min-h-14 rounded-2xl bg-soft text-danger"
                  >
                    🗑️
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {showHistory && <MedHistory meds={meds} logs={history} />}

      {edit && (
        <MedicineForm
          userId={userId}
          initial={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            void load();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(del)}
        danger
        body={`${t("confirmDelete")} (${del?.name})`}
        onOk={remove}
        onCancel={() => setDel(null)}
      />
      {actor === "user" &&
        "Notification" in window &&
        Notification.permission === "default" && (
          <BigButton
            variant="surface"
            className="w-full mt-4"
            label={t("notifPermission")}
            onClick={() => void Notification.requestPermission()}
          />
        )}
      {!canAdd && actor === "family" && (
        <p className="text-muted">{t("famReadOnly")}</p>
      )}
    </div>
  );
}

function MedHistory({ meds, logs }: { meds: Medicine[]; logs: MedLog[] }) {
  const { t, lang } = useI18n();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return (
    <Section title={t("history")}>
      <div
        className="grid grid-cols-7 gap-1 text-center"
        role="table"
        aria-label={t("history")}
      >
        {days.map((d) => {
          const day = dosesFor(
            meds,
            logs.filter(
              (l) =>
                new Date(l.scheduled_for).toDateString() === d.toDateString(),
            ),
            d,
            new Date(),
          );
          const relevant = day.filter(
            (x) => x.scheduled.getTime() <= Date.now(),
          );
          const taken = relevant.filter((x) => x.taken).length;
          const all = relevant.length;
          const tone =
            all === 0
              ? "bg-line"
              : taken === all
                ? "bg-green-500 text-white"
                : taken === 0
                  ? "bg-red-500 text-white"
                  : "bg-amber-400";
          return (
            <div
              key={d.toISOString()}
              role="cell"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-xs text-muted">
                {d.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                  weekday: "short",
                })}
              </span>
              <span
                className={`w-11 h-11 rounded-xl grid place-items-center font-bold text-sm ${tone}`}
                aria-label={`${fmtDate(d, lang)}: ${taken}/${all}`}
              >
                {all ? `${taken}/${all}` : "–"}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MedicineForm({
  userId,
  initial,
  onClose,
  onSaved,
}: {
  userId: string;
  initial: Partial<Medicine>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(initial.name ?? "");
  const [times, setTimes] = useState<string[]>(initial.times ?? []);
  const [custom, setCustom] = useState("");
  const [photo, setPhoto] = useState<string[]>(
    initial.photo_url ? [initial.photo_url] : [],
  );
  const [stock, setStock] = useState(
    initial.stock_count == null ? "" : String(initial.stock_count),
  );
  const [dose, setDose] = useState(String(initial.dose_per_time ?? 1));
  const [threshold, setThreshold] = useState(
    String(initial.low_stock_threshold ?? 5),
  );
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [busy, setBusy] = useState(false);
  const toggle = (tm: string) =>
    setTimes((x) =>
      x.includes(tm) ? x.filter((y) => y !== tm) : [...x, tm].sort(),
    );
  const save = async () => {
    if (!name.trim() || !times.length) {
      toast(`${t("medName")} / ${t("medTimes")}`, "error");
      return;
    }
    setBusy(true);
    const row = {
      stock_count: stock === "" ? null : Number(stock),
      dose_per_time: Number(dose),
      low_stock_threshold: Number(threshold),
      name: name.trim(),
      times,
      photo_url: photo[0] ?? null,
      notes: notes.trim() || null,
    };
    const { error } = initial.id
      ? await supabase.from("medicines").update(row).eq("id", initial.id)
      : await supabase.from("medicines").insert({ ...row, user_id: userId });
    setBusy(false);
    if (error) toast(error.message, "error");
    else {
      toast(t("saved"), "success");
      onSaved();
    }
  };
  return (
    <Sheet
      open
      title={initial.id ? t("editMedicine") : t("addMedicine")}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <Field label={t("medName")}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="font-semibold mb-2">{t("medTimes")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {TIME_CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={times.includes(c.time)}
                onClick={() => toggle(c.time)}
                className={`min-h-20 rounded-2xl font-bold border-4 flex flex-col items-center justify-center ${times.includes(c.time) ? "border-primary bg-soft text-primary" : "border-line"}`}
              >
                {t(c.key)}
                <span className="text-sm font-normal">
                  {hhmm12(c.time, lang)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="time"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label={t("customTime")}
            />
            <button
              type="button"
              onClick={() => {
                if (custom) {
                  toggle(custom);
                  setCustom("");
                }
              }}
              className="min-h-16 px-4 rounded-2xl bg-soft font-bold"
            >
              {t("add")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {times
              .filter((x) => !TIME_CHIPS.some((c) => c.time === x))
              .map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => toggle(x)}
                  className="min-h-12 px-3 rounded-full bg-primary text-on-primary"
                  aria-label={`${t("delete")} ${x}`}
                >
                  {hhmm12(x, lang)} ✕
                </button>
              ))}
          </div>
        </fieldset>
        <Field label={`${t("photo")} ${t("optional")}`}>
          <PhotoUpload value={photo} onChange={setPhoto} folder="medicines" />
        </Field>
        <Field label={t("notes")}>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ഭക്ഷണത്തിന് ശേഷം"
          />
        </Field>
        <Field label={t("stockCount")}>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <Field label={t("dosePerTime")}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
          />
        </Field>
        <Field label={t("stockThreshold")}>
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Field>
        <BigButton label={t("save")} icon="💾" disabled={busy} onClick={save} />
      </div>
    </Sheet>
  );
}
