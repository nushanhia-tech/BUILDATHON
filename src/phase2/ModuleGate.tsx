import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useUserSettings } from "../hooks/useUserSettings";
import { useI18n } from "../lib/i18n";
import { ReadAloudButton } from "../components/ui/ReadAloudButton";
export default function ModuleGate({
  module,
  children,
}: {
  module: string;
  children: ReactNode;
}) {
  const { isOn } = useUserSettings(),
    { t } = useI18n();
  return isOn(module) ? (
    children
  ) : (
    <div className="card p-5 grid gap-4">
      <p>{t("moduleUnavailable")}</p>
      <ReadAloudButton text={t("moduleUnavailable")} />
      <Link className="text-primary" to="/app/settings">
        {t("settingsTitle")}
      </Link>
    </div>
  );
}
