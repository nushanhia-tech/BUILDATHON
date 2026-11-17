import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRealtime } from "../hooks/useRealtime";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../lib/i18n";
export function useRows<T>(table: string, userId?: string) {
  const [rows, setRows] = useState<T[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    let q = supabase.from(table).select("*");
    if (userId) q = q.eq("user_id", userId);
    const r = await q.order("created_at", { ascending: false });
    setError(r.error?.message || "");
    setRows((r.data || []) as T[]);
    setLoading(false);
  }, [table, userId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useRealtime(table, () => void reload(), {
    filter: userId ? `user_id=eq.${userId}` : undefined,
  });
  return { rows, reload, loading, error };
}
export function VoiceClip({
  value,
  onChange,
  onTranscript,
}: {
  value: string;
  onChange: (v: string) => void;
  onTranscript?: (v: string) => void;
}) {
  const { t, lang } = useI18n(),
    toast = useToast();
  const stt = useSpeechRecognition({
    lang: lang === "ml" ? "ml-IN" : "en-IN",
    continuous: true,
    onFinal: onTranscript,
  });
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const upload = async (blob: Blob) => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw Error(t("error"));
      const path = `clips/${crypto.randomUUID()}.${blob.type.includes("mp4") ? "m4a" : "webm"}`;
      const r = await supabase.storage
        .from("voices")
        .upload(path, blob, { contentType: blob.type });
      if (r.error) throw r.error;
      change.current(path);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("recordFailed"), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy}
        className="min-h-14 bg-soft rounded-2xl"
        onClick={async () => {
          if (recording) {
            stt.stop();
            recorder.current?.stop();
            return;
          }
          try {
            stream.current = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            const r = new MediaRecorder(stream.current);
            recorder.current = r;
            const chunks: Blob[] = [];
            r.ondataavailable = (e) => chunks.push(e.data);
            r.onstop = () => {
              setRecording(false);
              stream.current?.getTracks().forEach((t) => t.stop());
              void upload(new Blob(chunks, { type: r.mimeType }));
            };
            r.start();
            if (onTranscript) stt.start();
            setRecording(true);
          } catch {
            toast(t("recordFailed"), "error");
          }
        }}
      >
        {recording ? "■ " + t("stopRecording") : "🎙️ " + t("recordVoice")}
      </button>
      <label>
        {t("uploadVoice")}
        <input
          type="file"
          accept="audio/*"
          disabled={busy || recording}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      {busy && <p role="status">{t("loading")}</p>}
      {value && <PrivateAudio path={value} />}
    </div>
  );
}
export function PrivateAudio({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    if (/^\/demo-voices\/[a-z-]+\.wav$/.test(path)) {
      setUrl(path);
      return () => {
        active = false;
      };
    }
    void supabase.storage
      .from("voices")
      .createSignedUrl(path, 3600)
      .then((r) => {
        if (active) setUrl(r.data?.signedUrl || "");
      });
    return () => {
      active = false;
    };
  }, [path]);
  return url ? <audio controls src={url} className="w-full" /> : null;
}
