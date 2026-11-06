import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { Role } from "@/types";
import { homeFor, useAuth } from "./AuthContext";

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg" aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}

/** Only lets in users of the given role; others go to their own home. */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  if (!user.onboarded && role !== "admin" && !location.pathname.endsWith("/welcome")) return <Navigate to={`/${role}/welcome`} replace />;
  return <Outlet />;
}

/** Login / signup pages: logged-in users are sent to their dashboard. */
export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
