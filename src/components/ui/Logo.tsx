import { cn } from "@/lib/cn";

/** Brand mark: three rising bars (growth / industry) on a teal gradient tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-[rgb(var(--hero-glow))] shadow-[0_2px_8px_-2px_rgb(var(--primary)/.5)] ring-1 ring-inset ring-white/20", className)}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round">
        <path d="M7 17v-4M12 17V7M17 17v-7" />
      </svg>
    </span>
  );
}
