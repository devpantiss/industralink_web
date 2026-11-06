import { Check, X } from "lucide-react";
import type { Application, ApplicationStage } from "@/types";
import { STAGE_LABEL_WORKER } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const STEPS: (ApplicationStage | "viewed")[] = ["applied", "viewed", "shortlisted", "interview", "offer", "hired"];
const STEP_LABEL: Record<string, string> = { ...STAGE_LABEL_WORKER, viewed: "Seen by employer" };

/** Vertical progress for the worker: done steps are filled, the rest are faded. */
export function ApplicationTimeline({ app }: { app: Application }) {
  const reached = new Map(app.timeline.map((e) => [e.stage, e.at]));
  const ended = app.stage === "rejected" || app.stage === "withdrawn";
  const lastDone = Math.max(...STEPS.map((s, i) => (reached.has(s) ? i : -1)));
  const steps = ended ? STEPS.slice(0, lastDone + 1) : STEPS;

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const at = reached.get(s);
        const done = !!at;
        const current = !ended && i === lastDone + 1;
        return (
          <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
            {i < steps.length - 1 + (ended ? 1 : 0) && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-16px)] w-0.5", done ? "bg-primary" : "bg-border")} aria-hidden />}
            <span className={cn("relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              done ? "bg-primary text-white" : current ? "border-2 border-primary bg-surface" : "border-2 border-border bg-surface")}>
              {done && <Check className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <div className="-mt-0.5">
              <p className={cn("text-body font-medium", done ? "text-ink" : "text-ink-muted")}>{STEP_LABEL[s]}</p>
              {at && <p className="text-small text-ink-muted">{formatDateTime(at)}</p>}
              {current && <p className="text-small text-ink-muted">Waiting for the employer</p>}
            </div>
          </li>
        );
      })}
      {ended && (
        <li className="relative flex gap-3">
          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-bg text-neutral-fg"><X className="h-3.5 w-3.5" aria-hidden /></span>
          <div className="-mt-0.5">
            <p className="text-body font-medium text-ink">{STAGE_LABEL_WORKER[app.stage]}</p>
            <p className="text-small text-ink-muted">{formatDateTime(app.updatedAt)}</p>
          </div>
        </li>
      )}
    </ol>
  );
}
