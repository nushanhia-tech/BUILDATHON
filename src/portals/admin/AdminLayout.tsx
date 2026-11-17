import { Outlet } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { SideShell, useDesktopTheme } from "../family/FamilyLayout";

export default function AdminLayout() {
  useDesktopTheme();
  const { t } = useI18n();
  const nav = [
    { to: "/admin", label: t("admDashboard"), end: true },
    { to: "/admin/modules", label: t("admModules") },
    { to: "/admin/content", label: t("admContent") },
    { to: "/admin/wheelchairs", label: t("admWheelchairs") },
    { to: "/admin/users", label: t("admUsers") },
    { to: "/admin/reports", label: t("admReports") },
  ];
  return (
    <SideShell title={t("admTitle")} nav={nav}>
      <Outlet />
    </SideShell>
  );
}
