import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, IndianRupee, ShieldCheck } from "lucide-react";

/** Sign-in / sign-up frame: plain top bar and one centred card, like Indeed. */
export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: ReactNode; children: ReactNode; side?: "worker" | "employer" | "admin" }) {
  const points = side === "employer"
    ? ["Post a job in under 2 minutes", "See ITI, licences and experience at a glance", "Move candidates on a simple hiring board"]
    : side === "admin"
      ? ["Approve companies", "Remove fake or unsafe jobs", "Every action is logged"]
      : ["Every company is checked by our team", "Pay shown on every job", "We never ask workers for money"];
  const icons = [BadgeCheck, IndianRupee, ShieldCheck];
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link to="/login" className="flex items-center gap-2" aria-label="IndustriaLink home">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary" aria-hidden>
              <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 22V10h4v12zM15 22V14h4v8zM21 22v-6h4v6z" fill="#fff" /></svg>
            </span>
            <span className="text-[19px] font-bold tracking-tight text-ink">Industria<span className="text-primary">Link</span></span>
          </Link>
          <span className="hidden text-small text-ink-muted sm:inline">Mining · Metals · Shipping · Oil & Gas · Logistics · Automotive</span>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:pt-[max(2.5rem,8vh)]">
        <div className="w-full max-w-[460px]">
          <div className="animate-page rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h1 className="text-h1 text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-body text-ink-secondary">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          <ul key={side} className="animate-page mt-5 grid gap-2.5 px-1 sm:px-2">
            {points.map((p, i) => {
              const Icon = icons[i]!;
              return <li key={p} className="flex items-center gap-2.5 text-small text-ink-secondary"><Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />{p}</li>;
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
