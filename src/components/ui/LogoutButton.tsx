import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../lib/i18n";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";

/** Logout with a confirm step. Shown on each portal's dashboard. */
export function LogoutButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button type="button" className={`lang-toggle logout-btn ${className}`} onClick={() => setAsk(true)} aria-label={t("logout")}>
        <Icon name="logout" size={18} />{!compact && <span>{t("logout")}</span>}
      </button>
      <ConfirmDialog open={ask} body={`${t("logout")}?`} onOk={() => void signOut()} onCancel={() => setAsk(false)} />
    </>
  );
}
