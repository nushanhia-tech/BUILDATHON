import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RoleGuard, RootRedirect } from "./auth/RoleGuard";
import { LoginPage, SignupPage } from "./auth/AuthPages";
import { Spinner } from "./components/ui/Bits";
import UserLayout from "./portals/user/UserLayout";
import FamilyLayout, { FamilyUserScope } from "./portals/family/FamilyLayout";
import AdminLayout from "./portals/admin/AdminLayout";

// User portal
const Onboarding = lazy(() => import("./portals/user/Onboarding"));
const Home = lazy(() => import("./portals/user/Home"));
const Medicines = lazy(() => import("./portals/user/Medicines"));
const Tasks = lazy(() => import("./portals/user/Tasks"));
const Vision = lazy(() => import("./portals/user/vision/Vision"));
const Hearing = lazy(() => import("./portals/user/hearing/Hearing"));
const Wheelchair = lazy(() => import("./portals/user/wheelchair/Wheelchair"));
const WheelchairDetail = lazy(() => import("./portals/user/wheelchair/WheelchairDetail"));
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
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/app" element={<RoleGuard role="user"><UserLayout /></RoleGuard>}>
          <Route index element={<Home />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="medicines" element={<Medicines />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="vision" element={<Vision />} />
          <Route path="hearing" element={<Hearing />} />
          <Route path="wheelchair" element={<Wheelchair />} />
          <Route path="wheelchair/:id" element={<WheelchairDetail />} />
          <Route path="family" element={<FamilySos />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/family" element={<RoleGuard role="family"><FamilyLayout /></RoleGuard>}>
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

        <Route path="/admin" element={<RoleGuard role="admin"><AdminLayout /></RoleGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="modules" element={<AdminModules />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="wheelchairs" element={<AdminWheelchairs />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
