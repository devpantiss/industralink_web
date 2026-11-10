import { Bus, Car, Clock, Factory, Fuel, Hammer, HardHat, Pickaxe, ShieldAlert, Ship, Timer, Truck, UtensilsCrossed, Home, Landmark, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Benefit, Job, Sector } from "@/types";
import { BENEFIT_LABEL, JOB_TYPE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
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
          <li key={b} className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-caption font-medium text-success-fg">
            <Icon className="h-3 w-3" aria-hidden /> {t(BENEFIT_LABEL[b])}
          </li>
        );
      })}
      {rest > 0 && <li className="rounded-full bg-surface-muted px-2 py-0.5 text-caption text-ink-muted">{t("+{n} more", { n: rest })}</li>}
    </ul>
  );
}

/** One pastel per industry, used for small sector icon tiles. */
export const SECTOR_TINT: Record<Sector, string> = {
  mining: "bg-tile-orange text-tile-orange-ink",
  metals: "bg-tile-blue text-tile-blue-ink",
  shipping: "bg-tile-blue text-tile-blue-ink",
  petroleum: "bg-tile-rose text-tile-rose-ink",
  logistics: "bg-tile-green text-tile-green-ink",
  automotive: "bg-tile-purple text-tile-purple-ink",
};

/** Solid brand-style colours for company logos. Picked from the company name, so a company always looks the same. */
const LOGO_COLORS = ["#E8590C", "#1C7ED6", "#2F9E44", "#5F3DC4", "#495057", "#D6336C", "#0C8599", "#E67700"];

/** Simple white glyph per industry, drawn inside the logo tile. */
const SECTOR_GLYPH: Record<Sector, string> = {
  metals: "M5 4h14v3.2h-5.2v9.6H19V20H5v-3.2h5.2V7.2H5z",
  shipping: "M2 8.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2v3c-2.5 0-2.5-2-5-2s-2.5 2-5 2-2.5-2-5-2-2.5 2-5 2zM2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2v3c-2.5 0-2.5-2-5-2s-2.5 2-5 2-2.5-2-5-2-2.5 2-5 2z",
  logistics: "M3 5h5l6 7-6 7H3l6-7zM10 5h5l6 7-6 7h-5l6-7z",
  automotive: "M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z",
  mining: "M1.5 20 9 6.5l4.2 7 2.3-3.5L22.5 20z",
  petroleum: "M12 2.5s7.5 7.8 7.5 12.5a7.5 7.5 0 0 1-15 0C4.5 10.3 12 2.5 12 2.5z",
};

export function companyColor(name: string) {
  return LOGO_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % LOGO_COLORS.length]!;
}

const LOGO_SIZE = { sm: "h-9 w-9 rounded-[10px]", md: "h-11 w-11 rounded-xl", lg: "h-14 w-14 rounded-2xl" } as const;

/** The company's uploaded logo, or a coloured tile with an industry glyph when there is none. */
export function CompanyLogo({ job, size = "md", className }: { job: Pick<Job, "companyName" | "sector" | "companyLogoUrl">; size?: keyof typeof LOGO_SIZE; className?: string }) {
  if (job.companyLogoUrl) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white", LOGO_SIZE[size], className)} aria-hidden>
        <img src={job.companyLogoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
      </span>
    );
  }
  const glyph = SECTOR_GLYPH[job.sector];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", LOGO_SIZE[size], className)} style={{ background: companyColor(job.companyName) }} aria-hidden>
      {glyph ? (
        <svg viewBox="0 0 24 24" className="h-[54%] w-[54%]" fill="#fff"><path d={glyph} fillRule="evenodd" /></svg>
      ) : <HardHat className="h-1/2 w-1/2 text-white" />}
    </span>
  );
}

export const ShiftIcon = Clock;
export const TradeIcon = Hammer;

/** "Contract · 6 months", or just the job type. */
export function jobTypeText(job: Pick<Job, "jobType" | "contractLength">) {
  const base = t(JOB_TYPE_LABEL[job.jobType]);
  return job.jobType === "contract" && job.contractLength ? `${base} · ${job.contractLength}` : base;
}

/** "12 Nov – 14 Nov, 09:00 – 13:00" for a walk-in. */
export function walkInWhen(w: NonNullable<Job["walkIn"]>) {
  const days = w.endDate && w.endDate !== w.date ? `${formatDate(w.date)} – ${formatDate(w.endDate)}` : formatDate(w.date);
  const time = w.time ? (w.endTime ? `${w.time} – ${w.endTime}` : w.time) : "";
  return [days, time].filter(Boolean).join(", ");
}
