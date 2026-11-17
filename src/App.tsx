import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RoleGuard, RootRedirect } from "./auth/RoleGuard";
import { LoginPage, SignupPage } from "./auth/AuthPages";
import { Spinner } from "./components/ui/Bits";
import UserLayout from "./portals/user/UserLayout";
import FamilyLayout, { FamilyUserScope } from "./portals/family/FamilyLayout";
import AdminLayout from "./portals/admin/AdminLayout";

import ModuleGate from "./phase2/ModuleGate";
import { SideShell } from "./portals/family/FamilyLayout";
import { useI18n } from "./lib/i18n";
import { Outlet } from "react-router-dom";
import { VolunteerProfile, Impact } from "./phase2/Help";
const Water = lazy(() => import("./phase2/Water"));
const Location = lazy(() => import("./phase2/Location"));
const Help = lazy(() => import("./phase2/Help"));
const Stories = lazy(() => import("./phase2/Stories"));
const Survey = lazy(() => import("./phase2/Survey"));
const Government = lazy(() => import("./phase2/Government"));
const Moderation = lazy(() => import("./phase2/Moderation"));
const Gallery = lazy(() => import("./phase2/Gallery"));
// User portal
const Onboarding = lazy(() => import("./portals/user/Onboarding"));
const Home = lazy(() => import("./portals/user/Home"));
const Medicines = lazy(() => import("./portals/user/Medicines"));
const Tasks = lazy(() => import("./portals/user/Tasks"));
const Vision = lazy(() => import("./portals/user/vision/Vision"));
const Hearing = lazy(() => import("./portals/user/hearing/Hearing"));
const Wheelchair = lazy(() => import("./portals/user/wheelchair/Wheelchair"));
const WheelchairDetail = lazy(
  () => import("./portals/user/wheelchair/WheelchairDetail"),
);
const FamilySos = lazy(() => import("./portals/user/FamilySos"));
const Settings = lazy(() => import("./portals/user/Settings"));
// Family portal
const FamilyHome = lazy(() => import("./portals/family/FamilyHome"));
const FamilyLink = lazy(() => import("./portals/family/FamilyLink"));
const FamilyAlerts = lazy(() => import("./portals/family/FamilyAlerts"));
const FamilyDashboard = lazy(() => import("./portals/family/FamilyDashboard"));
const FamilyCustomize = lazy(() => import("./portals/family/FamilyCustomize"));
const FamilyManage = lazy(() => import("./portals/family/FamilyManage"));
const FamilyMessages = lazy(() => import("./portals/family/FamilyMessages"));
// Admin portal
const AdminDashboard = lazy(() => import("./portals/admin/AdminDashboard"));
const AdminModules = lazy(() => import("./portals/admin/AdminModules"));
const AdminContent = lazy(() => import("./portals/admin/AdminContent"));
const AdminWheelchairs = lazy(() => import("./portals/admin/AdminWheelchairs"));
const AdminUsers = lazy(() => import("./portals/admin/AdminUsers"));
const AdminReports = lazy(() => import("./portals/admin/AdminReports"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <Spinner />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/app"
          element={
            <RoleGuard role="user">
              <UserLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Home />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route
            path="water"
            element={
              <ModuleGate module="water">
                <Water />
              </ModuleGate>
            }
          />
          <Route
            path="location"
            element={
              <ModuleGate module="location_safety">
                <Location />
              </ModuleGate>
            }
          />
          <Route
            path="help"
            element={
              <ModuleGate module="volunteer_help">
                <Help />
              </ModuleGate>
            }
          />
          <Route
            path="help/:id"
            element={
              <ModuleGate module="volunteer_help">
                <Help />
              </ModuleGate>
            }
          />
          <Route
            path="stories"
            element={
              <ModuleGate module="stories">
                <Stories />
              </ModuleGate>
            }
          />
          <Route
            path="stories/new"
            element={
              <ModuleGate module="stories">
                <Stories create />
              </ModuleGate>
            }
          />
          <Route
            path="survey"
            element={
              <ModuleGate module="needs_survey">
                <Survey />
              </ModuleGate>
            }
          />
          <Route
            path="gallery"
            element={
              <ModuleGate module="family_gallery">
                <Gallery />
              </ModuleGate>
            }
          />
          <Route path="medicines" element={<Medicines />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="vision" element={<Vision />} />
          <Route path="hearing" element={<Hearing />} />
          <Route path="wheelchair" element={<Wheelchair />} />
          <Route path="wheelchair/:id" element={<WheelchairDetail />} />
          <Route path="family" element={<FamilySos />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/family"
          element={
            <RoleGuard role="family">
              <FamilyLayout />
            </RoleGuard>
          }
        >
          <Route index element={<FamilyHome />} />
          <Route path="link" element={<FamilyLink />} />
          <Route path="alerts" element={<FamilyAlerts />} />
          <Route path="u/:userId" element={<FamilyUserScope />}>
            <Route index element={<FamilyDashboard />} />
            <Route path="customize" element={<FamilyCustomize />} />
            <Route path="messages" element={<FamilyMessages />} />
            <Route path=":section" element={<FamilyManage />} />
          </Route>
        </Route>

        <Route
          path="/admin"
          element={
            <RoleGuard role="admin">
              <AdminLayout />
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="modules" element={<AdminModules />} />
          <Route
            path="volunteers"
            element={<Moderation section="volunteers" />}
          />
          <Route path="help-requests" element={<Moderation section="help" />} />
          <Route path="stories" element={<Moderation section="stories" />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="wheelchairs" element={<AdminWheelchairs />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route
          path="/volunteer"
          element={
            <RoleGuard role="volunteer">
              <ExtraShell />
            </RoleGuard>
          }
        >
          <Route index element={<Help volunteer />} />
          <Route path="requests" element={<Help volunteer />} />
          <Route path="requests/:id" element={<Help volunteer />} />
          <Route path="profile" element={<VolunteerProfile />} />
          <Route path="impact" element={<Impact />} />
          <Route path="survey" element={<Survey />} />
        </Route>
        <Route
          path="/gov"
          element={
            <RoleGuard role="gov_admin">
              <ExtraShell gov />
            </RoleGuard>
          }
        >
          <Route index element={<Government />} />
          <Route path="reports" element={<Government />} />
          <Route path="export" element={<Government />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function ExtraShell({ gov = false }: { gov?: boolean }) {
  const { t } = useI18n();
  const nav = gov
    ? [
        { to: "/gov", label: t("govTitle"), end: true },
        { to: "/gov/reports", label: t("govReports") },
        { to: "/gov/export", label: t("govExport") },
      ]
    : [
        { to: "/volunteer", label: t("nearbyRequests"), end: true },
        { to: "/volunteer/requests", label: t("myRequests") },
        { to: "/volunteer/impact", label: t("impact") },
        { to: "/volunteer/profile", label: t("profile") },
        { to: "/volunteer/survey", label: t("surveyTitle") },
      ];
  return (
    <SideShell title={t(gov ? "govTitle" : "volunteerTitle")} nav={nav}>
      <Outlet />
    </SideShell>
  );
}
