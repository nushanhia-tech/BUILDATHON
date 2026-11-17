import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { Role } from "../lib/types";
import { Spinner } from "../components/ui/Bits";
import { useI18n } from "../lib/i18n";
import { useToast } from "../hooks/useToast";

export const homeFor = (role?: Role) => (role === "admin" ? "/admin" : role === "family" ? "/family" : "/app");

/** Role-based route guard: unauthenticated → /login, wrong role → that role's portal. */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  const loc = useLocation();
  const { t } = useI18n();
  const toast = useToast();
  useEffect(() => {
    if (profile?.blocked) { toast(t("blocked"), "error"); void signOut(); }
  }, [profile, signOut, t, toast]);
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (!session || !profile || profile.blocked) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />;
  return <>{children}</>;
}

export function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (!session || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(profile.role)} replace />;
}
