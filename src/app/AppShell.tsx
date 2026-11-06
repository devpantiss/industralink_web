import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronsLeft, ChevronsRight, LogOut, Plus, RotateCcw, WifiOff } from "lucide-react";
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
import { applyPalette, getPalette, PALETTES, type Palette } from "@/lib/palette";

function Logo({ collapsed, dark }: { collapsed?: boolean; dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", dark ? "bg-white/10 ring-1 ring-white/15" : "bg-navy")} aria-hidden>
        <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 22V10h4v12zM15 22V14h4v8zM21 22v-6h4v6z" fill="rgb(var(--accent))" /></svg>
      </span>
      {!collapsed && <span className={cn("text-h3 font-semibold tracking-tight", dark ? "text-white" : "text-ink")}>IndustriaLink</span>}
    </span>
  );
}

function useLocalFlag(key: string, initial: boolean) {
  const [v, setV] = useState(() => {
    try { return localStorage.getItem(key) === "1" ? true : localStorage.getItem(key) === "0" ? false : initial; } catch { return initial; }
  });
  const set = (next: boolean) => { setV(next); try { localStorage.setItem(key, next ? "1" : "0"); } catch { /* ignore */ } };
  return [v, set] as const;
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
        <div className="glass-menu animate-pop fixed inset-x-3 top-16 z-40 overflow-hidden rounded-2xl border border-white/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
            <h2 className="text-h3">Notifications</h2>
            {unread > 0 && <button className="text-small font-medium text-primary hover:underline" onClick={() => readAll.mutate()}>Mark all as read</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {q.data?.length === 0 && <li className="px-4 py-8 text-center text-body text-ink-muted">You're all caught up.</li>}
            {q.data?.map((n) => (
              <li key={n.id}>
                <button
                  className={cn("flex w-full gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-0 hover:bg-ink/[.04]", !n.read && "bg-primary-soft/60")}
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
  const [palette, setPalette] = useState<Palette>(getPalette);
  const ref = useClickOutside(open, () => setOpen(false));

  const resetDemo = async () => {
    const { resetMockDb } = await import("@/mocks/db");
    resetMockDb();
    toast.success("Demo data reset");
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-muted">
        <Avatar name={user.name} size="sm" />
        <span className="hidden max-w-[140px] truncate text-small font-medium text-ink md:inline">{user.name}</span>
      </button>
      {open && (
        <div className="glass-menu animate-pop absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-2xl border border-white/60 py-1">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-body font-medium text-ink">{user.name}</p>
            <p className="truncate text-small text-ink-muted">{user.phone ? `+91 ${user.phone}` : user.email}</p>
          </div>
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-muted">Colour theme</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Colour theme">
              {PALETTES.map((p) => (
                <button key={p.value} role="radio" aria-checked={palette === p.value} title={p.label} aria-label={p.label}
                  onClick={() => { applyPalette(p.value); setPalette(p.value); }}
                  className={cn("flex h-9 flex-1 overflow-hidden rounded-md ring-offset-2 transition-shadow", palette === p.value ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-border-strong")}>
                  <span className="h-full flex-1" style={{ background: p.swatch[0] }} />
                  <span className="h-full flex-1" style={{ background: p.swatch[1] }} />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-caption text-ink-secondary">{PALETTES.find((p) => p.value === palette)?.label}</p>
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
  const [collapsed, setCollapsed] = useLocalFlag("industrialink.sidebar.collapsed", false);
  const online = useOnline();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>

      {/* Sidebar: tablet = icons, desktop = full (collapsible) */}
      <aside className={cn("glass-dark fixed inset-y-0 left-0 z-30 hidden flex-col text-white transition-[width] duration-200 ease-brand sm:flex",
        collapsed ? "w-[72px]" : "w-[72px] lg:w-60")} aria-label={`${ROLE_LABEL[user.role]} navigation`}>
        <div className={cn("flex h-16 items-center border-b border-white/10 px-5", collapsed && "justify-center px-0")}>
          <Link to={`/${user.role}`} aria-label="IndustriaLink home" className="lg:hidden"><Logo collapsed dark /></Link>
          <Link to={`/${user.role}`} aria-label="IndustriaLink home" className="hidden lg:block"><Logo collapsed={collapsed} dark /></Link>
        </div>
        {!collapsed && <p className="hidden px-5 pt-5 text-caption font-semibold uppercase tracking-wider text-amber-300/90 lg:block">{ROLE_LABEL[user.role]}</p>}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} title={it.label}
              className={({ isActive }) => cn("relative flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors",
                isActive ? "bg-white/10 text-white before:absolute before:-left-3 before:top-2 before:h-6 before:w-[3px] before:rounded-r before:bg-accent" : "text-white/65 hover:bg-white/5 hover:text-white",
                collapsed ? "justify-center" : "justify-center lg:justify-start")}>
              <it.icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className={cn(collapsed ? "sr-only" : "sr-only lg:not-sr-only")}>{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setCollapsed(!collapsed)} className="m-3 hidden h-10 items-center gap-3 rounded-md px-3 text-small text-white/50 hover:bg-white/5 hover:text-white lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight className="mx-auto h-5 w-5" /> : <><ChevronsLeft className="h-5 w-5" /> Collapse</>}
        </button>
      </aside>

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200 ease-brand sm:pl-[72px]", !collapsed && "lg:pl-60")}>
        {/* Top bar */}
        <header className="glass sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link to={`/${user.role}`} className="sm:hidden" aria-label="IndustriaLink home"><Logo /></Link>
          <div className="flex-1" />
          {user.role === "employer" && (
            <LinkButton to="/employer/jobs/new" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">Post a job</LinkButton>
          )}
          <Notifications />
          <ProfileMenu />
        </header>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-small font-medium text-warning-fg">
            <WifiOff className="h-4 w-4" aria-hidden /> You're offline. Some actions won't work until you're back.
          </div>
        )}

        {user.role === "worker" && <ProfileNudge />}

        <main id="main" ref={mainRef} className="mx-auto w-full max-w-content flex-1 px-4 pb-32 pt-6 sm:px-6 sm:pb-10 lg:px-8 lg:pt-8">
          {/* key = path, so every page fades in gently */}
          <div key={pathname} className="animate-page"><Outlet /></div>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="glass fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex h-16 rounded-2xl border sm:hidden" aria-label="Main">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 text-caption font-medium transition-colors", isActive ? "text-primary before:absolute before:top-0 before:h-0.5 before:w-8 before:rounded-full before:bg-primary" : "text-ink-muted")}>
            <it.icon className="h-6 w-6" aria-hidden />
            {it.short ?? it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
