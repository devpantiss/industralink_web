import { Bus, Car, Clock, Factory, Fuel, Hammer, HardHat, Pickaxe, ShieldAlert, Ship, Timer, Truck, UtensilsCrossed, Home, Landmark, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Benefit, Job, Sector } from "@/types";
import { BENEFIT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const SECTOR_ICON: Record<Sector, LucideIcon> = {
  mining: Pickaxe, metals: Factory, shipping: Ship, petroleum: Fuel, logistics: Truck, automotive: Car,
};

const BENEFIT_ICON: Record<Benefit, LucideIcon> = {
  food: UtensilsCrossed, stay: Home, transport: Bus, pf_esi: Landmark, overtime: Timer, hazard_pay: ShieldAlert,
};

export function BenefitChips({ benefits, max, className }: { benefits: Benefit[]; max?: number; className?: string }) {
  const shown = max ? benefits.slice(0, max) : benefits;
  const rest = benefits.length - shown.length;
  if (!benefits.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label={t("Benefits")}>
      {shown.map((b) => {
        const Icon = BENEFIT_ICON[b];
        return (
          <li key={b} className="inline-flex items-center gap-1 rounded-sm bg-success-bg px-2 py-0.5 text-caption font-medium text-success-fg">
            <Icon className="h-3 w-3" aria-hidden /> {t(BENEFIT_LABEL[b])}
          </li>
        );
      })}
      {rest > 0 && <li className="rounded-sm bg-surface-muted px-2 py-0.5 text-caption text-ink-muted">{t("+{n} more", { n: rest })}</li>}
    </ul>
  );
}

/** One calm hue per industry, used for the icon tile everywhere. */
export const SECTOR_TINT: Record<Sector, string> = {
  mining: "bg-amber-100 text-amber-800",
  metals: "bg-slate-200 text-slate-700",
  shipping: "bg-cyan-100 text-cyan-800",
  petroleum: "bg-rose-100 text-rose-700",
  logistics: "bg-teal-100 text-teal-700",
  automotive: "bg-violet-100 text-violet-700",
};

export function CompanyLogo({ job, size = "md" }: { job: Pick<Job, "companyName" | "sector">; size?: "md" | "lg" }) {
  const Icon = SECTOR_ICON[job.sector] ?? HardHat;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", SECTOR_TINT[job.sector] ?? "bg-primary-soft text-primary", size === "lg" ? "h-14 w-14" : "h-11 w-11")} aria-hidden>
      <Icon className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
    </span>
  );
}

export const ShiftIcon = Clock;
export const TradeIcon = Hammer;
