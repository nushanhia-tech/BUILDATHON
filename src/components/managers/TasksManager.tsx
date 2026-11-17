import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { useToast } from "../../hooks/useToast";
import { endOfDay, fmtDateTime, fmtTime, pad, startOfDay, todayStr } from "../../lib/time";
import { speak } from "../../lib/tts";
import { keywords, matchScore } from "../../lib/voiceRouter";
import type { LinkLevel, MemoryNote, Task } from "../../lib/types";
import { Empty, Field, Section, Sheet, Spinner } from "../ui/Bits";
import { BigButton } from "../ui/BigButton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { VoiceInput } from "../ui/VoiceInput";
import { useNames } from "./useNames";
import { Icon } from "../ui/Icon";

export function TasksManager({ userId, actor, level = "full" }: { userId: string; actor: "user" | "family"; level?: LinkLevel }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Task | null>(null);
  const canAdd = actor === "user" || level !== "view";
  const canEdit = actor === "user" || level === "full";

  const load = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).order("due_at", { ascending: true, nullsFirst: false });
    setTasks((data ?? []) as Task[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("tasks", () => void load(), { filter: `user_id=eq.${userId}` });
  const names = useNames((tasks ?? []).map((x) => x.added_by));

  if (!tasks) return <Spinner />;
  const s0 = startOfDay().getTime(), s1 = endOfDay().getTime();
  const isToday = (x: Task) => x.due_at && +new Date(x.due_at) >= s0 && +new Date(x.due_at) <= s1;
  const pending = tasks.filter((x) => x.needs_confirmation);
  const open = tasks.filter((x) => !x.done && !x.needs_confirmation);
  const today = open.filter((x) => isToday(x) || (x.due_at && +new Date(x.due_at) < s0));
  const later = open.filter((x) => !today.includes(x));
  const done = tasks.filter((x) => x.done).slice(-10).reverse();

  const toggle = async (x: Task) => {
    const { error } = await supabase.from("tasks").update({ done: !x.done }).eq("id", x.id);
    if (error) toast(error.message, "error"); else void load();
  };
  const confirm = async (x: Task, ok: boolean) => {
    const { error } = ok ? await supabase.from("tasks").update({ needs_confirmation: false }).eq("id", x.id) : await supabase.from("tasks").delete().eq("id", x.id);
    if (error) toast(error.message, "error"); else void load();
  };
  const readToday = () => speak(today.length ? t("vrTodayTasks", { list: today.map((x) => `${x.title} ${x.due_at ? fmtTime(x.due_at, lang) : ""}`).join(", ") }) : t("vrNoTasks"), { force: true });
  const remove = async () => { const { error } = await supabase.from("tasks").delete().eq("id", del!.id); setDel(null); if (error) toast(error.message, "error"); else void load(); };

  const Card = ({ x }: { x: Task }) => (
    <li className={`card p-3 flex items-center gap-3 ${x.done ? "opacity-60" : ""}`}>
      <button type="button" disabled={!canEdit} onClick={() => void toggle(x)} aria-pressed={x.done} aria-label={`${x.title}: ${x.done ? t("done") : t("notDone")}`}
        className={`min-h-16 min-w-16 rounded-2xl text-2xl font-bold border-4 ${x.done ? "bg-success text-white border-success" : "border-line"}`}>{x.done ? "✓" : ""}</button>
      <div className="flex-1 min-w-0">
        <p className={`font-bold ${x.done ? "line-through" : ""}`}>{x.title}</p>
        {x.due_at && <p className="text-base text-muted"><Icon name="clock" size={18} className="inline-block align-[-0.25em] mr-1.5" />{fmtDateTime(x.due_at, lang)}</p>}
        {x.added_by && x.added_by !== userId && <p className="text-sm text-muted">+ {names[x.added_by] ?? ""}</p>}
      </div>
      {canEdit && <button type="button" onClick={() => setDel(x)} aria-label={`${t("delete")}: ${x.title}`} className="min-h-14 min-w-14 rounded-2xl bg-soft text-danger"><Icon name="trash" size={20} /></button>}
    </li>
  );

  return (
    <div>
      {actor === "user" && pending.map((x) => (
        <div key={x.id} role="alert" className="card p-4 mb-4 border-l-8 border-warn flex flex-col gap-3">
          <p className="font-bold">{t("familyAddedTask", { who: names[x.added_by ?? ""] ?? t("someone") })}</p>
          <p className="text-[1.3rem]"><Icon name="list" size={18} className="inline-block align-[-0.25em] mr-1.5" />{x.title}{x.due_at ? ` · ${fmtDateTime(x.due_at, lang)}` : ""}</p>
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant="surface" label={t("rejectItem")} onClick={() => void confirm(x, false)} />
            <BigButton variant="success" label={t("confirmItem")} onClick={() => void confirm(x, true)} />
          </div>
        </div>
      ))}
      {actor === "family" && pending.length > 0 && <p className="card p-3 mb-3 text-warn"><Icon name="hourglass" size={18} className="inline-block align-[-0.25em] mr-1.5" />{pending.length} · {t("pendingApprovalBadge")}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {canAdd && <BigButton label={t("addTask")} onClick={() => setAdding(true)} />}
        <BigButton variant="soft" label={t("readTodayTasks")} onClick={readToday} />
      </div>
      <Section title={t("today")}>{today.length ? <ul className="flex flex-col gap-2">{today.map((x) => <Card key={x.id} x={x} />)}</ul> : <Empty text={t("noTasks")} icon="✅" />}</Section>
      {later.length > 0 && <Section title={t("laterTasks")}><ul className="flex flex-col gap-2">{later.map((x) => <Card key={x.id} x={x} />)}</ul></Section>}
      {done.length > 0 && <Section title={t("doneTasks")}><ul className="flex flex-col gap-2">{done.map((x) => <Card key={x.id} x={x} />)}</ul></Section>}
      {adding && <TaskForm userId={userId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); void load(); }} />}
      <ConfirmDialog open={Boolean(del)} danger body={`${t("confirmDelete")} (${del?.title})`} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}

function TaskForm({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const now = new Date();
  const [time, setTime] = useState(`${pad(Math.min(now.getHours() + 1, 23))}:00`);
  const save = async () => {
    if (!title.trim()) return;
    const due = new Date(`${date}T${time || "10:00"}`);
    const { error } = await supabase.from("tasks").insert({ user_id: userId, title: title.trim(), due_at: due.toISOString() });
    if (error) toast(error.message, "error"); else { toast(t("saved"), "success"); onSaved(); }
  };
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <Sheet open title={t("addTask")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label={t("taskTitle")}><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={date === todayStr()} onClick={() => setDate(todayStr())} className={`min-h-16 rounded-2xl font-bold border-4 ${date === todayStr() ? "border-primary bg-soft" : "border-line"}`}>{t("today")}</button>
          <button type="button" aria-pressed={date === todayStr(tomorrow)} onClick={() => setDate(todayStr(tomorrow))} className={`min-h-16 rounded-2xl font-bold border-4 ${date === todayStr(tomorrow) ? "border-primary bg-soft" : "border-line"}`}>{t("tomorrow")}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("date")}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t("time")}><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <BigButton label={t("save")} icon="💾" onClick={save} />
      </div>
    </Sheet>
  );
}

/** "ഞാൻ എവിടെ വെച്ചു?" notes. */
export function MemoryNotes({ userId }: { userId: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [notes, setNotes] = useState<MemoryNote[] | null>(null);
  const [q, setQ] = useState("");
  const [del, setDel] = useState<MemoryNote | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("memory_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setNotes((data ?? []) as MemoryNote[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const add = async (text: string) => {
    const { error } = await supabase.from("memory_notes").insert({ user_id: userId, text });
    if (error) toast(error.message, "error"); else { speak(t("vrNoteSaved", { text })); void load(); }
  };
  const remove = async () => { await supabase.from("memory_notes").delete().eq("id", del!.id); setDel(null); void load(); };
  if (!notes) return <Spinner />;
  const words = keywords(q);
  const list = q ? notes.filter((n) => matchScore(n.text, words) > 0) : notes;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t("whereHelp")}</p>
      <VoiceInput onSubmit={add} placeholder={t("whereHelp")} micLabel={`🎤 ${t("addNote")}`} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔎 ${t("searchNotes")}`} aria-label={t("searchNotes")} />
      {q && list[0] && <BigButton variant="soft" label={`🔊 ${list[0].text}`} onClick={() => speak(list[0].text, { force: true })} />}
      {list.length === 0 ? <Empty text={t("noNotes")} icon="🔎" /> : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => (
            <li key={n.id} className="card p-3 flex items-center gap-3">
              <span className="flex-1"><span className="block font-semibold text-[1.15rem]">{n.text}</span><span className="block text-sm text-muted">{fmtDateTime(n.created_at, lang)}</span></span>
              <button type="button" onClick={() => speak(n.text, { force: true })} aria-label={`${t("readAloud")}: ${n.text}`} className="min-h-14 min-w-14 rounded-2xl bg-soft"><Icon name="speaker" size={20} /></button>
              <button type="button" onClick={() => setDel(n)} aria-label={t("delete")} className="min-h-14 min-w-14 rounded-2xl bg-soft text-danger"><Icon name="trash" size={20} /></button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={Boolean(del)} danger body={t("confirmDelete")} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
