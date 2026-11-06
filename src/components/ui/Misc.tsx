import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const avatarColors = ["bg-teal-100 text-teal-800", "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800", "bg-amber-100 text-amber-900", "bg-rose-100 text-rose-800", "bg-stone-200 text-stone-800"];

export function Avatar({ name, size = "md", square, className }: { name: string; size?: "sm" | "md" | "lg"; square?: boolean; className?: string }) {
  const color = avatarColors[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length];
  const sz = size === "sm" ? "h-8 w-8 text-caption" : size === "lg" ? "h-14 w-14 text-h2" : "h-10 w-10 text-small";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center font-semibold", square ? "rounded-md" : "rounded-full", sz, color, className)} aria-hidden>
      {initials(name) || "?"}
    </span>
  );
}

export function ProgressBar({ value, tone = "accent", label }: { value: number; tone?: "accent" | "primary" | "success"; label?: string }) {
  const color = tone === "accent" ? "bg-accent" : tone === "success" ? "bg-success-fg" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("origin-left-grow h-full rounded-full transition-[width] duration-300 ease-brand", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
              done ? "bg-primary text-white" : active ? "border-2 border-primary text-primary" : "border border-border-strong text-ink-muted")}>
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden text-small sm:inline", active ? "font-medium text-ink" : "text-ink-muted")}>{s}</span>
            {i < steps.length - 1 && <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            className={cn("-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-body font-medium transition-colors duration-200",
              active ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink")}>
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-2 py-px text-caption tabular", active ? "bg-primary-soft text-primary" : "bg-surface-muted text-ink-muted")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumb?: { label: string; to: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <Link to={breadcrumb.to} className="mb-1 inline-flex items-center gap-1 text-small text-ink-muted hover:text-primary">
            {breadcrumb.label} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
        <h1 className="text-h1 text-ink">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type StatTone = "blue" | "purple" | "amber" | "green" | "teal";
const STAT_TONE: Record<StatTone, string> = {
  blue: "bg-primary-soft text-primary",
  purple: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-700",
  teal: "bg-teal-100 text-teal-700",
};

/** Counts up from 0 once, so new numbers draw the eye without being flashy. */
function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function StatCard({ label, value, icon, hint, to, highlight, tone = "blue" }: { label: string; value: number; icon?: ReactNode; hint?: ReactNode; to?: string; highlight?: boolean; tone?: StatTone }) {
  const shown = useCountUp(value);
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-small font-medium text-ink-secondary">{label}</span>
        {icon && <span className={cn("hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex", STAT_TONE[tone])} aria-hidden>{icon}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-display text-ink tabular">{shown.toLocaleString("en-IN")}</span>
        {highlight && <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse-ring" aria-label="Needs attention" />}
      </div>
      {hint && <div className="mt-1 text-caption text-ink-muted">{hint}</div>}
    </>
  );
  const cls = cn("group relative block overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-xs sm:p-5",
    "before:absolute before:inset-x-0 before:top-0 before:h-1", {
      "before:bg-primary": tone === "blue", "before:bg-violet-500": tone === "purple", "before:bg-amber-500": tone === "amber",
      "before:bg-green-500": tone === "green", "before:bg-teal-500": tone === "teal",
    },
    to && "transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md");
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/** Coloured welcome band at the top of each Home page. */
export function Hero({ eyebrow, title, subtitle, actions, children }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-hero relative overflow-hidden rounded-xl px-5 py-6 text-white shadow-md sm:px-8 sm:py-8">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="animate-float pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/25 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-caption font-semibold uppercase tracking-wider text-amber-300">{eyebrow}</p>}
          <h1 className="mt-1 text-h1 sm:text-[28px] sm:leading-9">{title}</h1>
          {subtitle && <p className="mt-1 max-w-xl text-body-lg text-white/75">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  );
}

export function Banner({ tone = "warning", icon, children, action }: { tone?: "warning" | "info" | "danger" | "success"; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  const t = { warning: "bg-warning-bg text-warning-fg border-warning-fg/20", info: "bg-info-bg text-info-fg border-info-fg/20", danger: "bg-danger-bg text-danger-fg border-danger-fg/20", success: "bg-success-bg text-success-fg border-success-fg/20" }[tone];
  return (
    <div role="status" className={cn("flex flex-col gap-3 rounded-lg border px-4 py-3 text-body sm:flex-row sm:items-center", t)}>
      <div className="flex flex-1 items-start gap-2">{icon && <span className="mt-0.5 shrink-0">{icon}</span>}<div>{children}</div></div>
      {action}
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-caption text-ink-muted">{k}</dt>
          <dd className="mt-0.5 break-words text-body text-ink">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
