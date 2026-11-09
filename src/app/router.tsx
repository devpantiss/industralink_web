import { lazy, Suspense, type ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { FullPageLoader, GuestOnly, RequireRole } from "./guards";
import { homeFor, useAuth } from "./AuthContext";
import { ListSkeleton } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";

// Pages load on demand: smaller first download on slow phones.
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage"));
const AdminLoginPage = lazy(() => import("@/pages/auth/AdminLoginPage"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/auth/ForgotPassword").then((m) => ({ default: m.ResetPassword })));
const PublicJob = lazy(() => import("@/pages/public/PublicJob"));
const PublicJobs = lazy(() => import("@/pages/public/PublicJobs"));
const HelpPage = lazy(() => import("@/pages/public/HelpPage"));
const WorkerWelcome = lazy(() => import("@/pages/auth/WorkerWelcome"));
const EmployerWelcome = lazy(() => import("@/pages/auth/EmployerWelcome"));

const WorkerHome = lazy(() => import("@/pages/worker/WorkerHome"));
const FindJobs = lazy(() => import("@/pages/worker/FindJobs"));
const JobDetail = lazy(() => import("@/pages/worker/JobDetail"));
const CompanyDetail = lazy(() => import("@/pages/worker/CompanyDetail"));
const Applications = lazy(() => import("@/pages/worker/Applications"));
const ApplicationDetail = lazy(() => import("@/pages/worker/ApplicationDetail"));
const Saved = lazy(() => import("@/pages/worker/Saved"));
const Profile = lazy(() => import("@/pages/worker/Profile"));
const Companies = lazy(() => import("@/pages/worker/Companies"));
const Settings = lazy(() => import("@/pages/shared/Settings"));
const Messages = lazy(() => import("@/pages/shared/Messages"));
const FindWorkers = lazy(() => import("@/pages/employer/FindWorkers"));
const Analytics = lazy(() => import("@/pages/employer/Analytics"));

const EmployerHome = lazy(() => import("@/pages/employer/EmployerHome"));
const EmployerJobs = lazy(() => import("@/pages/employer/EmployerJobs"));
const PostJob = lazy(() => import("@/pages/employer/PostJob"));
const JobPipeline = lazy(() => import("@/pages/employer/JobPipeline"));
const Candidates = lazy(() => import("@/pages/employer/Candidates"));
const CompanyPage = lazy(() => import("@/pages/employer/CompanyPage"));

const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const Verifications = lazy(() => import("@/pages/admin/Verifications"));
const Users = lazy(() => import("@/pages/admin/Users"));
const AdminJobs = lazy(() => import("@/pages/admin/AdminJobs"));
const ActivityLog = lazy(() => import("@/pages/admin/ActivityLog"));
const Reports = lazy(() => import("@/pages/admin/Reports"));

const page = (el: ReactNode) => <Suspense fallback={<ListSkeleton count={2} />}>{el}</Suspense>;

/** Onboarding screens: no sidebar, just the logo. */
function WelcomeFrame() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-6">
      <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2.5">
        <LogoMark />
        <span className="text-h3 font-semibold">IndustriaLink</span>
      </div>
      <Suspense fallback={<FullPageLoader />}><Outlet /></Suspense>
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-display text-ink-muted">404</p>
      <h1 className="mt-2 text-h1">Page not found</h1>
      <p className="mt-1 text-body text-ink-secondary">The link may be wrong or the page was moved.</p>
      <LinkButton to="/" className="mt-6">Go to Home</LinkButton>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    element: <GuestOnly />,
    children: [
      { path: "/login", element: page(<LoginPage />) },
      { path: "/signup", element: page(<SignupPage />) },
      { path: "/admin/login", element: page(<AdminLoginPage />) },
      { path: "/forgot-password", element: page(<ForgotPassword />) },
      { path: "/reset-password", element: page(<ResetPassword />) },
    ],
  },
  // Open to everyone, logged in or not.
  { path: "/jobs", element: page(<PublicJobs />) },
  { path: "/jobs/:id", element: page(<PublicJob />) },
  { path: "/help", element: page(<HelpPage />) },
  {
    path: "/worker",
    element: <RequireRole role="worker" />,
    children: [
      { element: <WelcomeFrame />, children: [{ path: "welcome", element: <WorkerWelcome /> }] },
      {
        element: <AppShell />,
        children: [
          { index: true, element: page(<WorkerHome />) },
          { path: "jobs", element: page(<FindJobs />) },
          { path: "jobs/:id", element: page(<JobDetail />) },
          { path: "companies/:id", element: page(<CompanyDetail />) },
          { path: "applications", element: page(<Applications />) },
          { path: "applications/:id", element: page(<ApplicationDetail />) },
          { path: "saved", element: page(<Saved />) },
          { path: "profile", element: page(<Profile />) },
          { path: "companies", element: page(<Companies />) },
          { path: "messages", element: page(<Messages />) },
          { path: "settings", element: page(<Settings />) },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: "/employer",
    element: <RequireRole role="employer" />,
    children: [
      { element: <WelcomeFrame />, children: [{ path: "welcome", element: <EmployerWelcome /> }] },
      {
        element: <AppShell />,
        children: [
          { index: true, element: page(<EmployerHome />) },
          { path: "jobs", element: page(<EmployerJobs />) },
          { path: "jobs/new", element: page(<PostJob />) },
          { path: "jobs/:id", element: page(<JobPipeline />) },
          { path: "jobs/:id/edit", element: page(<PostJob />) },
          { path: "candidates", element: page(<Candidates />) },
          { path: "company", element: page(<CompanyPage />) },
          { path: "messages", element: page(<Messages />) },
          { path: "find-workers", element: page(<FindWorkers />) },
          { path: "analytics", element: page(<Analytics />) },
          { path: "settings", element: page(<Settings />) },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: <RequireRole role="admin" />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: page(<AdminHome />) },
          { path: "verifications", element: page(<Verifications />) },
          { path: "users", element: page(<Users />) },
          { path: "jobs", element: page(<AdminJobs />) },
          { path: "activity", element: page(<ActivityLog />) },
          { path: "reports", element: page(<Reports />) },
          { path: "settings", element: page(<Settings />) },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  { path: "*", element: <div className="p-6"><NotFound /></div> },
]);
