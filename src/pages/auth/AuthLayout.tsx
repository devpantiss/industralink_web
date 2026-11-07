import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { LangToggle, t } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { BadgeCheck, IndianRupee, ShieldCheck } from "lucide-react";

const SECTORS = [["mining", "Mining"], ["aluminium", "Aluminium"], ["shipping", "Shipping"], ["petroleum", "Oil & Gas"], ["logistics", "Logistics"], ["automotive", "Automotive"]] as const;

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: ReactNode; children: ReactNode; side?: "worker" | "employer" | "admin" }) {
  const copy = side === "employer"
    ? { h: "Hire skilled industrial workers, faster.", points: ["Post a job in under 2 minutes", "See ITI, licences and experience at a glance", "Move candidates on a simple hiring board"] }
    : side === "admin"
      ? { h: "IndustriaLink admin console.", points: ["Approve companies", "Remove fake or unsafe jobs", "Every action is logged"] }
      : { h: t("India's trusted platform for industrial jobs."), points: [t("Every company is checked by our team"), t("Pay shown clearly on every job"), t("We never ask workers for money")] };
  const icons = [BadgeCheck, IndianRupee, ShieldCheck];
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="bg-hero relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <img src="/media/login.jpg" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        {/* Dark teal wash: keeps the photo visible but the text readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--hero-from)/0.85)] via-[rgb(var(--hero-from)/0.6)] to-[rgb(var(--hero-from)/0.95)]" aria-hidden />
        <Link to="/login" className="relative flex items-center gap-2.5">
          <LogoMark />
          <span className="text-h2">IndustriaLink</span>
        </Link>
        <div key={side} className="animate-page relative">
          <h2 className="text-[34px] font-semibold leading-tight">{copy.h}</h2>
          <ul className="stagger mt-8 space-y-4 text-body-lg text-white/85">
            {copy.points.map((p, i) => {
              const Icon = icons[i]!;
              return (
                <li key={p} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15"><Icon className="h-5 w-5 text-amber-300" aria-hidden /></span>
                  {p}
                </li>
              );
            })}
          </ul>
        </div>
        <ul className="relative flex flex-wrap gap-2">
          {SECTORS.map(([file, name]) => (
            <li key={file} className="flex items-center gap-2 rounded-full bg-black/30 py-1 pl-1 pr-3 text-small text-white/90 ring-1 ring-white/15 backdrop-blur">
              <img src={`/media/sectors/${file}.jpg`} alt="" className="h-6 w-6 rounded-full object-cover" />
              {name}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:pt-[max(2.5rem,10vh)]">
        <div className="animate-page w-full max-w-[420px]">
          {/* Phone: small photo banner in place of the side panel */}
          <Link to="/login" className="relative mb-6 flex h-32 items-end overflow-hidden rounded-xl p-4 text-white shadow-md lg:hidden">
            <img src="/media/login.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" />
            <span className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--hero-from)/0.9)] to-[rgb(var(--hero-from)/0.1)]" aria-hidden />
            <span className="relative flex items-center gap-2.5">
              <LogoMark />
              <span className="text-h3 font-semibold">IndustriaLink</span>
            </span>
          </Link>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-h1 text-ink">{title}</h1>
            {side !== "admin" && <LangToggle className="shrink-0" />}
          </div>
          {subtitle && <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
