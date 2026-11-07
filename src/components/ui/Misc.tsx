import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const avatarColors = ["bg-tile-green text-tile-green-ink", "bg-tile-blue text-tile-blue-ink", "bg-tile-orange text-tile-orange-ink", "bg-tile-purple text-tile-purple-ink", "bg-tile-rose text-tile-rose-ink", "bg-tile-yellow text-tile-yellow-ink"];

export function Avatar({ name, size = "md", square, className, src }: { name: string; size?: "sm" | "md" | "lg" | "xl"; square?: boolean; className?: string; src?: string }) {
  const color = avatarColors[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length];
  const sz = size === "sm" ? "h-8 w-8 text-caption" : size === "lg" ? "h-14 w-14 text-h2" : size === "xl" ? "h-20 w-20 text-[26px]" : "h-10 w-10 text-small";
  if (src) return <img src={src} alt="" className={cn("shrink-0 object-cover", square ? "rounded-md" : "rounded-full", sz, className)} />;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center font-semibold", square ? "rounded-md" : "rounded-full", sz, color, className)} aria-hidden>
      {initials(name) || "?"}
    </span>
  );
}

export function ProgressBar({ value, tone = "primary", label }: { value: number; tone?: "accent" | "primary" | "success"; label?: string }) {
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
  blue: "bg-tile-blue text-tile-blue-ink",
  purple: "bg-tile-purple text-tile-purple-ink",
  amber: "bg-tile-orange text-tile-orange-ink",
  green: "bg-tile-green text-tile-green-ink",
  teal: "bg-primary-soft text-primary",
};

export function StatCard({ label, value, icon, hint, to, highlight, tone = "blue" }: { label: string; value: number; icon?: ReactNode; hint?: ReactNode; to?: string; highlight?: boolean; tone?: StatTone }) {
  const shown = value;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-small font-medium text-ink-secondary">{label}</span>
        {icon && <span className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex", STAT_TONE[tone])} aria-hidden>{icon}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-display text-ink tabular">{shown.toLocaleString("en-IN")}</span>
        {highlight && <span className="h-2.5 w-2.5 rounded-full bg-danger-fg" aria-label="Needs attention" />}
      </div>
      {hint && <div className="mt-1 text-caption text-ink-muted">{hint}</div>}
    </>
  );
  const cls = cn("group relative block overflow-hidden rounded-lg border border-border bg-surface p-4 sm:p-5",
    to && "transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md");
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/** Geometric shapes for banners: cobalt, ink and safety-yellow blocks with a hazard stripe. */
export function BannerArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 h-full", className)}>
      <defs>
        <pattern id="il-hazard" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="22" height="22" fill="rgb(var(--accent))" /><rect width="11" height="22" fill="rgb(var(--text))" />
        </pattern>
      </defs>
      <polygon points="70,40 230,40 175,150 15,150" fill="rgb(var(--primary))" />
      <polygon points="250,0 400,0 530,130 400,260 250,260 380,130" fill="rgb(var(--text))" />
      <polygon points="330,0 365,0 495,130 365,260 330,260 460,130" fill="rgb(var(--surface-muted))" />
      <polygon points="455,0 600,0 600,150" fill="rgb(var(--accent))" />
      <polygon points="495,200 600,200 600,260 460,260" fill="url(#il-hazard)" />
    </svg>
  );
}

/** Light welcome band with geometric art on the right. `image` is kept for old callers and ignored. */
export function Hero({ eyebrow, title, subtitle, actions, children }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode; image?: string }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-surface-muted px-5 py-6 sm:px-8 sm:py-8">
      <BannerArt className="w-[90%] opacity-15 sm:w-[48%] sm:opacity-100" />
      <div className="relative flex flex-col gap-5 sm:max-w-[54%]">
        <div className="min-w-0">
          {eyebrow && <p className="text-small font-semibold text-primary">{eyebrow}</p>}
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-body-lg text-ink-secondary">{subtitle}</p>}
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
