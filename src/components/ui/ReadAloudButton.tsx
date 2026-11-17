import { useI18n } from "../../lib/i18n";
import { speak } from "../../lib/tts";
import { Icon, splitLabel } from "./Icon";

/** "🔊 വായിച്ചുതരൂ" — reads the screen title and main instructions. Always speaks (force). */
export function ReadAloudButton({ text, className = "" }: { text: string | string[]; className?: string }) {
  const { t } = useI18n();
  const body = Array.isArray(text) ? text.filter(Boolean).join(". ") : text;
  return (
    <button
      type="button"
      onClick={() => speak(body, { force: true })}
      aria-label={t("readAloudAria")}
      className={`min-h-11 rounded-full bg-soft text-primary font-semibold px-4 inline-flex items-center gap-2 text-[0.9rem] ${className}`}
    >
      <Icon name="speaker" size={20} />{splitLabel(t("readAloud")).text}
    </button>
  );
}
