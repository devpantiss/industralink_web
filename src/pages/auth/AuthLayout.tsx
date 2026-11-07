import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { BannerArt } from "@/components/ui/Misc";
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
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-surface-muted p-10 lg:flex">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] overflow-hidden" aria-hidden><BannerArt className="w-full" /></div>
        <Link to="/login" className="relative flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[19px] font-extrabold tracking-tight text-ink">IndustriaLink</span>
        </Link>
        <div key={side} className="animate-page relative">
          <h2 className="max-w-md text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">{copy.h}</h2>
          <ul className="mt-7 space-y-3.5 text-body-lg text-ink-secondary">
            {copy.points.map((p, i) => {
              const Icon = icons[i]!;
              const tone = ["bg-tile-blue text-tile-blue-ink", "bg-tile-green text-tile-green-ink", "bg-tile-yellow text-tile-yellow-ink"][i];
              return (
                <li key={p} className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden /></span>
                  {p}
                </li>
              );
            })}
          </ul>
          <ul className="mt-8 flex max-w-md flex-wrap gap-2">
            {SECTORS.map(([file, name]) => (
              <li key={file} className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-small font-semibold text-ink-secondary">
                <img src={`/media/sectors/${file}.jpg`} alt="" className="h-6 w-6 rounded-full object-cover" />
                {name}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative h-24" aria-hidden />
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
            {side !== "admin" && <LangToggle className="shrink-0" />}
          </div>
          {subtitle && <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
