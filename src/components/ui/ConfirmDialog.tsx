import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { speak } from "../../lib/tts";

interface Props {
  open: boolean; title?: string; body?: ReactNode; danger?: boolean;
  okLabel?: string; cancelLabel?: string; onOk: () => void; onCancel: () => void; speakText?: string;
}

/** Big "ശരി" / "വേണ്ട" confirmation dialog for important actions. */
export function ConfirmDialog({ open, title, body, danger, okLabel, cancelLabel, onOk, onCancel, speakText }: Props) {
  const { t } = useI18n();
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    okRef.current?.focus();
    if (speakText) speak(speakText);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, speakText]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] bg-black/60 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="card w-full max-w-md p-6 flex flex-col gap-5">
        <h2 id="confirm-title" className="text-[1.4rem] font-bold">{title ?? t("confirmTitle")}</h2>
        {body && <div className="text-lg">{body}</div>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-20 rounded-3xl bg-soft text-ink font-bold text-[1.3rem] border-2 border-line">
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={onOk}
            className={`min-h-20 rounded-3xl font-bold text-[1.3rem] ${danger ? "bg-danger text-on-danger" : "bg-primary text-on-primary"}`}
          >
            {okLabel ?? t("ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
