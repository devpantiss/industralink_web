import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Avatar, BannerArt } from "@/components/ui/Misc";
import { LangToggle, t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Link } from "react-router-dom";
import { BadgeCheck, CalendarClock, CheckCircle2, Flag, Flame, IndianRupee, ShieldCheck, Users, type LucideIcon } from "lucide-react";

type Side = "worker" | "employer" | "admin";

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: ReactNode; children: ReactNode; side?: Side }) {
  const s: Side = side ?? "worker";
  const copy = s === "employer"
    ? { h: "Hire skilled industrial workers, faster.", points: ["Post a job in under 2 minutes", "See ITI, licences and experience at a glance", "Move candidates on a simple hiring board"] }
    : s === "admin"
      ? { h: "IndustriaLink admin console.", points: ["Approve companies", "Remove fake or unsafe jobs", "Every action is logged"] }
      : { h: t("India's trusted platform for industrial jobs."), points: [t("Every company is checked by our team"), t("Pay shown clearly on every job"), t("We never ask workers for money")] };
  const icons: LucideIcon[] = [BadgeCheck, IndianRupee, ShieldCheck];

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-[46%] max-w-[640px] overflow-hidden bg-ink dark:bg-navy lg:block">
        <img src="/media/login.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[35%_30%]" />
        {/* Shade top and bottom so the logo and headline stay readable */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/85 via-black/55 to-transparent" aria-hidden />
        <HazardStrip />

        <div className="relative flex h-full flex-col p-10 xl:p-12">
          <Link to="/login" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[19px] font-extrabold tracking-tight text-white">IndustriaLink</span>
          </Link>

          <Showcase side={s} />

          <div key={s} className="animate-page mt-auto pb-4">
            <h2 className="max-w-md text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white xl:text-[38px]">{copy.h}</h2>
            <ul className="mt-6 space-y-3 text-body-lg text-white/85">
              {copy.points.map((p, i) => {
                const Icon = icons[i]!;
                return (
                  <li key={p} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white"><Icon className="h-5 w-5" aria-hidden /></span>
                    {p}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:pt-[max(2.5rem,10vh)]">
        <div className="animate-page w-full max-w-[420px]">
          {/* Phone: small light banner in place of the side panel */}
          <Link to="/login" className="relative mb-6 flex h-28 items-end overflow-hidden rounded-xl bg-surface-muted p-4 lg:hidden">
            <BannerArt className="w-[48%]" />
            <span className="relative flex items-center gap-2.5">
              <LogoMark />
              <span className="text-h3 font-extrabold text-ink">IndustriaLink</span>
            </span>
          </Link>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle className="h-9 w-9" />
              {side !== "admin" && <LangToggle className="shrink-0" />}
            </div>
          </div>
          {subtitle && <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

/**
 * Two small cards floating on the photo, showing what the app does for this
 * audience. Illustration only.
 */
function Showcase({ side }: { side: Side }) {
  return (
    <div key={side} className="pointer-events-none absolute inset-0" aria-hidden>

      {side === "worker" && <>
        <Float className="right-10 top-[30%] [animation-delay:240ms] xl:right-12">
          <Pill icon={CheckCircle2} tone="bg-success-bg text-success-fg" title={t("You're shortlisted")} sub={t("HR can call you now")} />
        </Float>
        <Float className="right-10 top-[13%] w-[300px] [animation-delay:120ms] xl:right-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Flame className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate text-body font-bold text-ink">{t("Welder (ITI)")}</p>
              <p className="truncate text-caption text-ink-muted">{t("Aluminium plant")} · Jharsuguda, Odisha</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-tile-green px-2.5 py-1 text-caption font-bold text-tile-green-ink">₹18,000 – 22,000 / {t("month")}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-caption font-bold text-primary"><BadgeCheck className="h-3.5 w-3.5" />{t("Verified")}</span>
          </div>
        </Float>
      </>}

      {side === "employer" && <>
        <Float className="right-10 top-[30%] [animation-delay:240ms] xl:right-12">
          <Pill icon={CalendarClock} tone="bg-tile-purple text-tile-purple-ink" title="Interview tomorrow" sub="10:00 AM · Gate 2" />
        </Float>
        <Float className="right-10 top-[13%] w-[300px] [animation-delay:120ms] xl:right-12">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-body font-bold text-ink">Welder (ITI)</p>
              <p className="text-caption text-ink-muted">12 new applicants</p>
            </div>
            <div className="flex -space-x-2">
              {["Rajan M", "Amit P", "Suresh K"].map((n) => <Avatar key={n} name={n} size="sm" className="border-2 border-surface" />)}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-caption font-bold">
            <span className="rounded-lg bg-tile-blue py-1.5 text-tile-blue-ink">24 applied</span>
            <span className="rounded-lg bg-tile-orange py-1.5 text-tile-orange-ink">6 shortlisted</span>
            <span className="rounded-lg bg-tile-green py-1.5 text-tile-green-ink">2 hired</span>
          </div>
        </Float>
      </>}

      {side === "admin" && <>
        <Float className="right-10 top-[30%] [animation-delay:240ms] xl:right-12">
          <Pill icon={Flag} tone="bg-tile-rose text-tile-rose-ink" title="Reported job removed" sub="Asked workers for a fee" />
        </Float>
        <Float className="right-10 top-[13%] w-[300px] [animation-delay:120ms] xl:right-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Users className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-body font-bold text-ink">3 companies to review</p>
              <p className="text-caption text-ink-muted">Check the GST document, then approve</p>
            </div>
          </div>
        </Float>
      </>}
    </div>
  );
}

function Float({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`animate-rise absolute rounded-2xl bg-surface p-3.5 shadow-lg ${className ?? ""}`}>{children}</div>;
}

function Pill({ icon: Icon, tone, title, sub }: { icon: LucideIcon; tone: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 pr-1">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
      <span>
        <span className="block text-small font-bold text-ink">{title}</span>
        <span className="block text-caption text-ink-muted">{sub}</span>
      </span>
    </div>
  );
}

/** Yellow-black safety-tape strip along the bottom edge. */
function HazardStrip() {
  return (
    <svg className="absolute inset-x-0 bottom-0 h-2.5 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id="auth-hazard" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="rgb(var(--accent))" /><rect width="8" height="16" fill="rgb(var(--text))" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-hazard)" />
    </svg>
  );
}
