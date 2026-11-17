import { useEffect } from "react";
import { useI18n } from "../../lib/i18n";

/** Full-screen alternating flash with huge text (Hearing Mode alerts). */
export function FlashOverlay({ open, text, sub, durationMs = 3000, onClose, persistent }: {
  open: boolean; text: string; sub?: string; durationMs?: number; onClose: () => void; persistent?: boolean;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open || persistent) return;
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [open, durationMs, onClose, persistent]);
  if (!open) return null;
  return (
    <div role="alert" aria-live="assertive" className="fixed inset-0 z-[950] flash-anim grid place-items-center p-6 text-center" onClick={onClose}>
      <div className="bg-black/80 text-white rounded-3xl p-8 max-w-xl">
        <p className="text-[2.6rem] font-extrabold leading-tight">{text}</p>
        {sub && <p className="text-2xl mt-3">{sub}</p>}
        <button type="button" onClick={onClose} className="mt-6 min-h-16 px-8 rounded-3xl bg-white text-black font-bold text-xl">{t("close")}</button>
      </div>
    </div>
  );
}
