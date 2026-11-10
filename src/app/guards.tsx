import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { Building2, HardHat, Loader2 } from "lucide-react";
import type { Role } from "@/types";
import { getHandoff } from "@/lib/handoff";
import { Button, LinkButton } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { homeFor, useAuth } from "./AuthContext";

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg" aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}

/** Where a logged-in user lands. An employer who started a job post on the landing site goes straight to it. */
export function landingFor(role: Role) {
  return role === "employer" && getHandoff().draft ? "/employer/jobs/new" : homeFor(role);
}

const ROLE_NAME: Record<Role, string> = { worker: "a job seeker", employer: "a company", admin: "an admin" };

/**
 * Shown when a link is meant for the other kind of account, e.g. "Post a job"
 * while a worker is logged in. Never switch accounts silently.
 */
function WrongAccount({ want }: { want: Role }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const Icon = want === "employer" ? Building2 : HardHat;
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-xs">
        <LogoMark className="mx-auto h-10 w-10" />
        <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon className="h-6 w-6" aria-hidden /></span>
        <h1 className="mt-4 text-h2 text-ink">This page is for {ROLE_NAME[want]}</h1>
        <p className="mt-2 text-body text-ink-secondary">
          You're logged in as {ROLE_NAME[user.role]} (<span className="font-medium text-ink">{user.name}</span>).
          {want === "employer" ? " To post jobs, log out and continue with your company account." : " To look for jobs, log out and continue with your mobile number."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {/* Logging out keeps the same address, so the right form opens next. */}
          <Button onClick={signOut}>Log out and continue as {ROLE_NAME[want]}</Button>
          <LinkButton to={homeFor(user.role)} variant="secondary">Go to my dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}

/** Only lets in users of the given role. */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) {
    const login = role === "admin" ? "/admin/login" : `/login?as=${role}`;
    return <Navigate to={login} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== role) return role === "admin" ? <Navigate to={homeFor(user.role)} replace /> : <WrongAccount want={role} />;
  if (!user.onboarded && role !== "admin" && !location.pathname.endsWith("/welcome")) return <Navigate to={`/${role}/welcome`} replace />;
  return <Outlet />;
}

/** Login / signup pages: logged-in users go to their dashboard, unless the link asked for the other kind of account. */
export function GuestOnly() {
  const { user, loading } = useAuth();
  const [sp] = useSearchParams();
  if (loading) return <FullPageLoader />;
  if (user) {
    const want = sp.get("as");
    if ((want === "worker" || want === "employer") && want !== user.role) return <WrongAccount want={want} />;
    return <Navigate to={landingFor(user.role)} replace />;
  }
  return <Outlet />;
}
