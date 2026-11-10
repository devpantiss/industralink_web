import { Suspense } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { t, LangToggle } from "@/lib/i18n";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LinkButton } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/States";
import { useAuth, homeFor } from "@/app/AuthContext";
import { FullPageLoader } from "@/app/guards";
import FindJobs from "@/pages/worker/FindJobs";

/** The landing site's address (logo link). Optional. */
const LANDING_URL = import.meta.env.VITE_LANDING_URL as string | undefined;

/**
 * /jobs — job search anyone can use, no login needed. The landing site's
 * search box opens this page with ?q=&city=&trade=&sector= already set.
 * Logged-in workers are sent to their own Find jobs page with the same filters.
 */
export default function PublicJobs() {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  if (loading) return <FullPageLoader />;
  if (user?.role === "worker") return <Navigate to={`/worker/jobs${search}`} replace />;

  const logo = (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-h3 font-semibold text-ink">IndustriaLink</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
          {LANDING_URL ? <a href={LANDING_URL} aria-label="IndustriaLink home">{logo}</a> : <Link to="/jobs" aria-label="IndustriaLink jobs">{logo}</Link>}
          <div className="flex items-center gap-2">
            <LangToggle className="hidden sm:flex" />
            <ThemeToggle className="h-9 w-9" />
            {user ? (
              <LinkButton to={homeFor(user.role)} size="sm">{t("Go to dashboard")}</LinkButton>
            ) : (
              <>
                <Link to="/login?as=worker" className="rounded-lg px-3 py-2 text-small font-semibold text-ink-secondary hover:text-ink">{t("Log in")}</Link>
                <LinkButton to="/signup?as=worker" size="sm">{t("Sign up free")}</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
        <Suspense fallback={<ListSkeleton count={3} />}><FindJobs /></Suspense>
      </main>
    </div>
  );
}
