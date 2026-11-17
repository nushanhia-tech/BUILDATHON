import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { useToast } from "../../hooks/useToast";
import { uploadPhoto } from "../../lib/storage";
import { speak } from "../../lib/tts";
import { fmtDateTime } from "../../lib/time";
import type { Message } from "../../lib/types";
import { Empty, Spinner } from "../ui/Bits";
import { BigButton } from "../ui/BigButton";
import { useNames } from "./useNames";
import { Icon } from "../ui/Icon";

/** Conversation between `me` and `other` (or all of my conversations if other is omitted). */
export function MessageThread({ me, other, big = false, canRecord = false }: { me: string; other?: string; big?: boolean; canRecord?: boolean }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    let q = supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
    q = other ? q.or(`and(from_id.eq.${me},to_id.eq.${other}),and(from_id.eq.${other},to_id.eq.${me})`) : q.or(`from_id.eq.${me},to_id.eq.${me}`);
    const { data } = await q;
    const rows = (data ?? []) as Message[];
    setMsgs(rows);
    const unread = rows.filter((m) => m.to_id === me && !m.read).map((m) => m.id);
    if (unread.length) void supabase.from("messages").update({ read: true }).in("id", unread);
  }, [me, other]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("messages", () => void load(), { filter: `to_id=eq.${me}` });
  useEffect(() => () => streamRef.current?.getTracks().forEach((tr) => tr.stop()), []);
  const names = useNames((msgs ?? []).map((m) => m.from_id));

  const target = other ?? (msgs ?? []).filter((m) => m.from_id !== me).at(-1)?.from_id;
  const send = async (payload: { text?: string; audio_url?: string }) => {
    if (!target) return;
    const { error } = await supabase.from("messages").insert({ from_id: me, to_id: target, ...payload });
    if (error) toast(error.message, "error"); else { setText(""); void load(); }
  };
  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      const r = new MediaRecorder(s);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        s.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        try { const url = await uploadPhoto(blob, "voice"); await send({ audio_url: url }); } catch (e) { toast(String(e), "error"); }
      };
      r.start();
      setRec(r);
    } catch { toast(t("micError"), "error"); }
  };
  const stopRec = () => { rec?.stop(); setRec(null); };

  if (!msgs) return <Spinner />;
  return (
    <div className="flex flex-col gap-3">
      {msgs.length === 0 ? <Empty text={t("noMessages")} icon="✉️" /> : (
        <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {msgs.map((m) => {
            const mine = m.from_id === me;
            return (
              <li key={m.id} className={`max-w-[85%] rounded-3xl p-4 ${mine ? "self-end bg-primary text-on-primary" : "self-start card"}`}>
                {!mine && <p className="text-sm font-semibold opacity-80">{names[m.from_id] ?? ""}</p>}
                {m.text && <p className={big ? "text-[1.2rem] font-semibold leading-snug" : ""}>{m.text}</p>}
                {m.audio_url && <audio controls src={m.audio_url} className="mt-2 w-full max-w-xs" aria-label={t("playAudio")} />}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-70 flex-1">{fmtDateTime(m.created_at, lang)}</span>
                  {m.text && !mine && <button type="button" onClick={() => speak(m.text!, { force: true })} aria-label={t("readAloud")} className="min-h-12 min-w-12 rounded-xl bg-soft text-primary"><Icon name="speaker" size={20} /></button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {target && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void send({ text: text.trim() }); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeHere")} aria-label={t("message")} />
          <button type="submit" className="min-h-16 min-w-16 rounded-2xl bg-primary text-on-primary font-bold" aria-label={t("sendMessage")}><Icon name="send" size={20} /></button>
        </form>
      )}
      {canRecord && target && (rec
        ? <BigButton variant="danger" label={`🔴 ${t("recording")} — ${t("stopRecording")}`} onClick={stopRec} />
        : <BigButton variant="soft" label={t("recordVoice")} onClick={startRec} />)}
    </div>
  );
}
