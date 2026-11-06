import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Plus, RotateCcw, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { notificationsApi } from "@/api/notifications";
import { qk } from "@/api/keys";
import { USE_MOCKS } from "@/api/client";
import { Avatar } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useUser } from "./AuthContext";
import { ProfileNudge } from "@/components/domain/ProfileNudge";
import { NAV, ROLE_LABEL } from "./nav";

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary" aria-hidden>
        <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 22V10h4v12zM15 22V14h4v8zM21 22v-6h4v6z" fill="#fff" /></svg>
      </span>
      <span className="text-[19px] font-bold tracking-tight text-ink">Industria<span className="text-primary">Link</span></span>
    </span>
  );
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: qk.notifications, queryFn: notificationsApi.list, refetchInterval: 60_000 });
  const readAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) });
  const unread = q.data?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted hover:text-ink">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-on">{unread}</span>}
      </button>
      {open && (
        <div className="glass-menu animate-pop fixed inset-x-3 top-16 z-40 overflow-hidden rounded-lg border sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-h3">Notifications</h2>
            {unread > 0 && <button className="text-small font-medium text-primary hover:underline" onClick={() => readAll.mutate()}>Mark all as read</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {q.data?.length === 0 && <li className="px-4 py-8 text-center text-body text-ink-muted">You're all caught up.</li>}
            {q.data?.map((n) => (
              <li key={n.id}>
                <button
                  className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-ink/[.04]", !n.read && "bg-primary-soft/60")}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read) notificationsApi.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: qk.notifications }));
                    if (n.link) navigate(n.link);
                  }}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-ink">{n.title}</span>
                    <span className="block text-small text-ink-secondary">{n.body}</span>
                    <span className="mt-1 block text-caption text-ink-muted">{timeAgo(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const user = useUser();
  const { signOut } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));

  const resetDemo = async () => {
    const { resetMockDb } = await import("@/mocks/db");
    resetMockDb();
    toast.success("Demo data reset");
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-surface-muted">
        <Avatar name={user.name} size="sm" />
        <ChevronDown className="hidden h-4 w-4 text-ink-muted md:block" aria-hidden />
      </button>
      {open && (
        <div className="glass-menu animate-pop absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-lg border py-1">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-body font-medium text-ink">{user.name}</p>
            <p className="truncate text-small text-ink-muted">{user.phone ? `+91 ${user.phone}` : user.email}</p>
          </div>
          {USE_MOCKS && (
            <button onClick={resetDemo} className="flex w-full items-center gap-2 px-4 py-2.5 text-body text-ink-secondary hover:bg-surface-muted">
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data
            </button>
          )}
          <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-body text-danger-fg hover:bg-danger-bg">
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const user = useUser();
  const items = NAV[user.role];
  const online = useOnline();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>

      {/* Top bar: logo, main links, actions. Same on every role. */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-content items-center gap-6 px-4 sm:h-16 sm:px-6">
          <Link to={`/${user.role}`} aria-label="IndustriaLink home" className="shrink-0"><Logo /></Link>
          <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label={`${ROLE_LABEL[user.role]} navigation`}>
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => cn("relative flex items-center px-3 text-body font-medium transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors",
                  isActive ? "text-ink after:bg-primary" : "text-ink-secondary after:bg-transparent hover:text-ink")}>
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {user.role === "admin" && <span className="hidden rounded-full bg-surface-muted px-2.5 py-1 text-caption font-semibold text-ink-secondary sm:inline">Admin</span>}
          {user.role === "employer" && (
            <LinkButton to="/employer/jobs/new" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">Post a job</LinkButton>
          )}
          <div className="flex items-center gap-1">
            <Notifications />
            <ProfileMenu />
          </div>
        </div>
      </header>

      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-small font-medium text-warning-fg">
          <WifiOff className="h-4 w-4" aria-hidden /> You're offline. Some actions won't work until you're back.
        </div>
      )}

      {user.role === "worker" && <ProfileNudge />}

      <main id="main" className="mx-auto w-full max-w-content px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:pt-7">
        <div key={pathname} className="animate-page"><Outlet /></div>
      </main>

      {/* Phone: bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => cn("flex h-16 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium", isActive ? "text-primary" : "text-ink-muted")}>
            {({ isActive }) => (<>
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-primary-soft")}><it.icon className="h-5 w-5" aria-hidden /></span>
              {it.short ?? it.label}
            </>)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
