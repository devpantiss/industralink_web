import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, IndianRupee, ShieldCheck } from "lucide-react";

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: ReactNode; children: ReactNode; side?: "worker" | "employer" | "admin" }) {
  const copy = side === "employer"
    ? { h: "Hire skilled industrial workers, faster.", points: ["Post a job in under 2 minutes", "See ITI, licences and experience at a glance", "Move candidates on a simple hiring board"] }
    : side === "admin"
      ? { h: "IndustriaLink admin console.", points: ["Approve companies", "Remove fake or unsafe jobs", "Every action is logged"] }
      : { h: "India's trusted platform for industrial jobs.", points: ["Every company is checked by our team", "Pay shown clearly on every job", "We never ask workers for money"] };
  const icons = [BadgeCheck, IndianRupee, ShieldCheck];
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="bg-hero relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="animate-float pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <Link to="/login" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/20">
            <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden><path d="M9 22V10h4v12zM15 22V14h4v8zM21 22v-6h4v6z" fill="rgb(var(--accent))" /></svg>
          </span>
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
        <p className="relative text-small text-white/50">Mining · Metals · Shipping · Oil & Gas · Logistics · Automotive</p>
      </aside>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:pt-[max(2.5rem,10vh)]">
        <div className="animate-page w-full max-w-[420px]">
          <Link to="/login" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy">
              <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden><path d="M9 22V10h4v12zM15 22V14h4v8zM21 22v-6h4v6z" fill="rgb(var(--accent))" /></svg>
            </span>
            <span className="text-h3 font-semibold">IndustriaLink</span>
          </Link>
          <h1 className="text-h1 text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
