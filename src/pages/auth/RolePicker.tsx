import { Building2, HardHat } from "lucide-react";
import { cn } from "@/lib/cn";

export type Audience = "worker" | "employer";

const KEY = "industrialink.audience";
export const rememberAudience = (a: Audience) => { try { localStorage.setItem(KEY, a); } catch { /* ignore */ } };
export const lastAudience = (): Audience => { try { return localStorage.getItem(KEY) === "employer" ? "employer" : "worker"; } catch { return "worker"; } };

/** Big, clear choice so workers and HR never land on the wrong form. */
export function RolePicker({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  const opts = [
    { v: "worker" as const, icon: HardHat, title: "I'm looking for a job", text: "Workers · mobile login" },
    { v: "employer" as const, icon: Building2, title: "I'm hiring", text: "Companies & HR · email login" },
  ];
  return (
    <div role="radiogroup" aria-label="Who are you?" className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-surface-muted/70 p-1.5 shadow-[inset_0_1px_2px_rgb(15_23_42/.06)]">
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => { onChange(o.v); rememberAudience(o.v); }}
            className={cn("flex flex-col items-start gap-1 rounded-lg px-3 py-3 text-left transition-all duration-200",
              on ? "bg-surface shadow-md ring-1 ring-primary/30" : "text-ink-secondary hover:bg-surface/60")}>
            <span className="flex items-center gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-md transition-colors", on ? "bg-primary text-white" : "bg-surface text-ink-muted")}>
                <o.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className={cn("text-body font-semibold leading-tight", on ? "text-ink" : "text-ink-secondary")}>{o.title}</span>
            </span>
            <span className="text-caption text-ink-muted">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
