import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n } from "../../lib/i18n";
import { PageHeader } from "../../components/ui/Bits";
import { MedicinesManager } from "../../components/managers/MedicinesManager";

export default function Medicines() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { features } = useUserSettings();
  const showHistory = features("medicines").some((f) => f.key === "history");
  return (
    <div>
      <PageHeader title={t("medicinesTitle")} help={t("medicinesHelp")} icon="💊" />
      <MedicinesManager userId={profile!.id} actor="user" showHistory={showHistory} />
    </div>
  );
}
