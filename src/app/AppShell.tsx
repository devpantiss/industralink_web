import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, HelpCircle, LifeBuoy, LogOut, MoreVertical, Plus, RotateCcw, Search, Settings as SettingsIcon, User as UserIcon, WifiOff } from "lucide-react";
import { LangToggle, t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { messagesApi } from "@/api/extra";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { notificationsApi } from "@/api/notifications";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { USE_MOCKS } from "@/api/client";
import { startLiveChat, useLiveConnected } from "@/api/live";
import { Avatar } from "@/components/ui/Misc";
import { LogoMark } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSlideIndicator } from "@/hooks/useSlideIndicator";
import { useAuth, useUser } from "./AuthContext";
import { ProfileNudge } from "@/components/domain/ProfileNudge";
import { NAV, ROLE_LABEL, type NavItem } from "./nav";

function Brand({ to, compact }: { to: string; compact?: boolean }) {
  return (
    <Link to={to} aria-label="IndustriaLink home" className="flex shrink-0 items-center gap-2.5 rounded-md">
      <LogoMark />
      <span className={cn("text-[17px] font-extrabold tracking-tight text-ink", compact && "hidden sm:inline")}>IndustriaLink</span>
    </Link>
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

const roundBtn = "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink";

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
      <button onClick={() => setOpen(!open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} className={roundBtn}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[10px] font-bold text-white ring-2 ring-surface">{unread}</span>}
      </button>
      {open && (
        <div className="glass-menu animate-pop fixed inset-x-3 top-16 z-40 overflow-hidden rounded-xl border sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-h3">{t("Notifications")}</h2>
            {unread > 0 && <button className="text-small font-semibold text-primary hover:underline" onClick={() => readAll.mutate()}>{t("Mark all as read")}</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {q.data?.length === 0 && <li className="px-4 py-8 text-center text-body text-ink-muted">{t("You're all caught up.")}</li>}
            {q.data?.map((n) => (
              <li key={n.id}>
                <button
                  className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-muted", !n.read && "bg-primary-soft/50")}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read) notificationsApi.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: qk.notifications }));
                    if (n.link) navigate(n.link);
                  }}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-ink">{n.title}</span>
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

/** Account menu. `variant="header"` = avatar in the top bar, `"card"` = user card at the bottom of the sidebar. */
function ProfileMenu({ variant = "header" }: { variant?: "header" | "card" }) {
  const user = useUser();
  const { signOut } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile, enabled: user.role === "worker" });
  const sub = user.role === "worker" ? (profile.data?.location ? `${profile.data.location.city}, ${profile.data.location.state}` : user.phone ? `+91 ${user.phone}` : "") : user.email ?? "";

  const resetDemo = async () => {
    const { resetMockDb } = await import("@/mocks/db");
    resetMockDb();
    toast.success("Demo data reset");
    setTimeout(() => window.location.reload(), 400);
  };

  const item = "flex w-full items-center gap-2.5 px-4 py-2.5 text-body text-ink-secondary hover:bg-surface-muted hover:text-ink";
  return (
    <div className="relative" ref={ref}>
      {variant === "header" ? (
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2.5 rounded-full p-0.5 hover:bg-surface-muted xl:rounded-xl xl:py-1 xl:pl-1 xl:pr-3">
          <Avatar name={user.name} src={profile.data?.photoUrl} />
          <span className="hidden min-w-0 text-left xl:block">
            <span className="block max-w-[150px] truncate text-small font-semibold text-ink">{user.name}</span>
            {sub && <span className="block max-w-[150px] truncate text-caption text-ink-muted">{sub}</span>}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 border-t border-border px-2 pt-3">
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold text-ink">{user.name}</span>
            <span className="block truncate text-caption text-ink-muted">{sub}</span>
          </span>
          <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}
      {open && (
        <div className={cn("glass-menu animate-pop absolute z-40 w-64 overflow-hidden rounded-xl border py-1", variant === "header" ? "right-0 top-12" : "bottom-12 left-0")}>
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-body font-semibold text-ink">{user.name}</p>
            <p className="truncate text-small text-ink-muted">{user.phone ? `+91 ${user.phone}` : user.email}</p>
          </div>
          {user.role === "worker" && (
            <Link to="/worker/profile" onClick={() => setOpen(false)} className={item}><UserIcon className="h-4 w-4" aria-hidden /> {t("My profile")}</Link>
          )}
          <Link to={`/${user.role}/settings`} onClick={() => setOpen(false)} className={item}><SettingsIcon className="h-4 w-4" aria-hidden /> {t("Settings")}</Link>
          <Link to="/help" onClick={() => setOpen(false)} className={item}><LifeBuoy className="h-4 w-4" aria-hidden /> {t("Help & support")}</Link>
          {USE_MOCKS && <button onClick={resetDemo} className={item}><RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data</button>}
          <button onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-body text-danger-fg hover:bg-danger-bg"><LogOut className="h-4 w-4" aria-hidden /> {t("Log out")}</button>
        </div>
      )}
    </div>
  );
}

/** Unread message count for the Messages nav item. Refreshed live; the timer is a fallback. */
function useUnread(enabled: boolean) {
  const live = useLiveConnected();
  const q = useQuery({ queryKey: qk.messages.all, queryFn: messagesApi.threads, enabled, refetchInterval: live ? 120_000 : 30_000 });
  return q.data?.reduce((s, th) => s + th.unread, 0) ?? 0;
}

/** Live chat updates for workers and HR, while logged in (real backend only). */
function useLiveChatFor(role: string, userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (USE_MOCKS || role === "admin") return;
    return startLiveChat(qc);
  }, [qc, role, userId]);
}

function NavCount({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return <span className={cn("flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[10px] font-bold text-white", className)} aria-label={`${n} unread`}>{n}</span>;
}

/* ---------------- Worker: top navigation (desktop) ---------------- */

function WorkerTopBar({ items, unread }: { items: NavItem[]; unread: number }) {
  const { pathname } = useLocation();
  const { box, ind } = useSlideIndicator<HTMLElement>("x", [pathname]);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Brand to="/worker" compact />
        <nav ref={box} className="relative hidden h-full items-stretch gap-6 lg:flex" aria-label="Main">
          {items.filter((it) => it.top !== false).map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => cn("relative flex items-center gap-1.5 text-body font-semibold transition-colors", isActive ? "text-primary" : "text-ink-secondary hover:text-ink")}>
              {t(it.label)}
              {it.to.endsWith("/messages") && <NavCount n={unread} />}
            </NavLink>
          ))}
          <span ref={ind} className="slide-ind absolute bottom-0 left-0 h-[3px] w-0 rounded-t-full bg-primary" aria-hidden />
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle className="hidden sm:flex" />
          <Notifications />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

/* ---------------- Employer & admin: white sidebar ---------------- */

function Sidebar({ items, unread, role }: { items: NavItem[]; unread: number; role: "employer" | "admin" }) {
  const { pathname } = useLocation();
  const { box, ind } = useSlideIndicator<HTMLElement>("y", [pathname]);
  const groups: string[] = [];
  for (const it of items) if (it.group && !groups.includes(it.group)) groups.push(it.group);
  const link = "relative z-10 flex h-10 items-center gap-3 rounded-lg px-3 text-body font-semibold transition-colors";
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-3 pb-3 pt-5 lg:flex" aria-label={`${ROLE_LABEL[role]} navigation`}>
      <div className="px-3 pb-4"><Brand to={`/${role}`} /></div>
      <nav ref={box} className="relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Main">
        <span ref={ind} className="slide-ind absolute left-0 right-0 top-0 h-10 rounded-lg bg-primary-soft" aria-hidden />
        {groups.map((g) => (
          <Fragment key={g}>
            <p className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted first:pt-1">{g}</p>
            {items.filter((it) => it.group === g).map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn(link, isActive ? "text-primary" : "text-ink-secondary hover:bg-surface-muted hover:text-ink")}>
                <it.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="truncate">{it.label}</span>
                {it.to.endsWith("/messages") && <NavCount n={unread} className="ml-auto" />}
              </NavLink>
            ))}
          </Fragment>
        ))}
        <p className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Preferences</p>
        <NavLink to={`/${role}/settings`} className={({ isActive }) => cn(link, isActive ? "text-primary" : "text-ink-secondary hover:bg-surface-muted hover:text-ink")}>
          <SettingsIcon className="h-[18px] w-[18px]" aria-hidden /> Settings
        </NavLink>
        <Link to="/help" className={cn(link, "text-ink-secondary hover:bg-surface-muted hover:text-ink")}><HelpCircle className="h-[18px] w-[18px]" aria-hidden /> Help center</Link>
      </nav>
      <div className="pt-3"><ProfileMenu variant="card" /></div>
    </aside>
  );
}

function StaffTopBar({ role }: { role: "employer" | "admin" }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    const base = role === "employer" ? "/employer/candidates" : "/admin/users";
    navigate(v ? `${base}?q=${encodeURIComponent(v)}` : base);
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:h-[72px] lg:px-8">
      <div className="lg:hidden"><Brand to={`/${role}`} compact /></div>
      <form onSubmit={submit} role="search" className="hidden max-w-md flex-1 sm:block">
        <label className="flex h-10 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-ink-muted transition-colors focus-within:border-primary hover:border-border-strong">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={role === "employer" ? "Search candidates by name, city or skill…" : "Search workers and companies…"}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
        </label>
      </form>
      <div className="flex-1" />
      {role === "employer" && <LinkButton to="/employer/jobs/new" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden h-10 sm:inline-flex">Post a job</LinkButton>}
      <ThemeToggle />
      <Link to="/help" aria-label="Help" className={cn(roundBtn, "hidden sm:flex")}><HelpCircle className="h-[18px] w-[18px]" /></Link>
      <Notifications />
      <div className="lg:hidden"><ProfileMenu /></div>
    </header>
  );
}

/* ---------------- Phone tab bar (all roles) ---------------- */

function TabBar({ items, unread }: { items: NavItem[]; unread: number }) {
  const { pathname } = useLocation();
  const { box, ind } = useSlideIndicator<HTMLDivElement>("x", [pathname]);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
      <div ref={box} className="relative mx-auto flex h-16 max-w-xl px-1.5 py-1.5">
        <span ref={ind} className="slide-ind absolute left-0 top-1.5 h-[52px] w-0 rounded-xl bg-primary-soft" aria-hidden />
        {items.filter((it) => it.mobile !== false).map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => cn("relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors", isActive ? "text-primary" : "text-ink-muted")}>
            <span className="relative"><it.icon className="h-[22px] w-[22px]" aria-hidden />{it.to.endsWith("/messages") && <NavCount n={unread} className="absolute -right-3 -top-1.5" />}</span>
            <span className="block w-full truncate px-0.5 text-center leading-tight">{t(it.short ?? it.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppShell() {
  const user = useUser();
  const items = NAV[user.role];
  const unread = useUnread(user.role !== "admin");
  useLiveChatFor(user.role, user.id);
  const online = useOnline();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const offline = !online && (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-small font-medium text-warning-fg">
      <WifiOff className="h-4 w-4" aria-hidden /> You're offline. Some actions won't work until you're back.
    </div>
  );
  const main = (
    <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
      {/* key = path, so each page fades in once */}
      <div key={pathname} className="animate-page"><Outlet /></div>
    </main>
  );
  const skip = <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>;

  if (user.role === "worker") {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        {skip}
        <WorkerTopBar items={items} unread={unread} />
        {offline}
        <ProfileNudge />
        {main}
        <TabBar items={items} unread={unread} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {skip}
      <Sidebar items={items} unread={unread} role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopBar role={user.role} />
        {offline}
        {main}
      </div>
      <TabBar items={items} unread={unread} />
    </div>
  );
}
