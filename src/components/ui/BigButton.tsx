import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useA11y } from "../../hooks/useA11y";
import { speak } from "../../lib/tts";
import { useI18n } from "../../lib/i18n";
import { Icon, iconFor, splitLabel } from "./Icon";

type Variant = "primary" | "surface" | "danger" | "soft" | "success" | "tile";

export interface BigButtonProps {
  label: string;
  icon?: ReactNode;
  sub?: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Tile colour accent (module colour). */
  accent?: string;
  ariaLabel?: string;
  pressed?: boolean;
}

const styles: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-dark shadow-[0_10px_24px_rgba(47,111,237,.3)]",
  surface: "card text-ink border-2 border-line",
  soft: "bg-soft text-primary border-2 border-transparent",
  danger: "bg-danger text-on-danger shadow-[0_10px_24px_rgba(220,38,38,.3)]",
  success: "bg-success text-white",
  tile: "tile text-ink",
};

/**
 * Large accessible button (≥64×64px). In Vision Mode the first tap speaks the label and
 * a second tap within 3 s activates it.
 */
export function BigButton({ label, icon, sub, onClick, to, href, variant = "primary", className = "", disabled, type = "button", accent, ariaLabel, pressed }: BigButtonProps) {
  const { vision } = useA11y();
  const { t } = useI18n();
  const nav = useNavigate();
  const armedAt = useRef(0);
  const [armed, setArmed] = useState(false);

  const activate = () => {
    if (href) {
      if (href.startsWith("http")) window.open(href, "_blank", "noopener");
      else window.location.href = href;
    } else if (to) nav(to);
    onClick?.();
  };

  const handle = () => {
    if (disabled) return;
    if (vision && Date.now() - armedAt.current > 3000) {
      armedAt.current = Date.now();
      setArmed(true);
      speak(`${splitLabel(label).text}. ${t("tapAgain")}`, { force: true });
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    armedAt.current = 0;
    setArmed(false);
    activate();
  };

  const isTile = variant === "tile";
  // Leading emoji in labels/icons are rendered with the Sa Hai icon set.
  const parsed = splitLabel(label);
  const text = parsed.text;
  const iconNode = typeof icon === "string"
    ? (iconFor(icon) ? <Icon name={iconFor(icon)!} size={isTile ? 30 : 22} /> : icon)
    : icon ?? (parsed.icon ? <Icon name={parsed.icon} size={isTile ? 30 : 22} /> : null);
  return (
    <button
      type={type}
      onClick={type === "submit" && !vision ? undefined : handle}
      onDoubleClick={vision ? () => { armedAt.current = 0; activate(); } : undefined}
      disabled={disabled}
      aria-label={ariaLabel ?? (sub ? `${text}. ${sub}` : text)}
      aria-pressed={pressed}
      className={`min-h-14 min-w-14 rounded-2xl px-4 py-3 font-semibold transition active:scale-[.98] disabled:opacity-50 ${
        isTile ? "flex flex-col items-start justify-between gap-3 text-left" : "flex items-center justify-center gap-2.5"
      } ${styles[variant]} ${armed ? "ring-4 ring-warn" : ""} ${className}`}
    >
      {iconNode != null && (
        <span
          aria-hidden="true"
          className={isTile ? "module-icon grid place-items-center w-12 h-12 rounded-2xl text-2xl" : "grid place-items-center text-xl"}
          style={isTile && accent ? { background: `${accent}1a`, color: accent } : undefined}
        >
          {iconNode}
        </span>
      )}
      <span className={isTile ? "leading-tight" : ""}>
        <span className="block">{text}</span>
        {sub && <span className={`block text-sm font-normal ${variant === "primary" || variant === "danger" ? "opacity-90" : "text-muted"}`}>{sub}</span>}
      </span>
    </button>
  );
}
