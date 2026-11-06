import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Heart, MapPin, Zap } from "lucide-react";
import type { JobForWorker } from "@/types";
import { BENEFIT_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatDate, formatPay, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { VerifiedTick } from "@/components/ui/Badge";
import { CompanyLogo } from "./JobBits";

/**
 * Job card in the Indeed / Naukri style: title, company, place, then grey
 * "fact pills" (pay first). For blue-collar workers pay, shift and food/stay
 * matter most, so those are the pills.
 *
 * `onSelect` turns on list + detail mode: on wide screens clicking the card
 * opens the job in the side pane instead of a new page.
 */
export function JobCard({ job, onToggleSave, saving, selected, onSelect }: {
  job: JobForWorker; onToggleSave?: (job: JobForWorker) => void; saving?: boolean; selected?: boolean; onSelect?: (id: string) => void;
}) {
  const closed = job.status !== "active";
  const noPay = !job.payMin && !job.payMax;
  const isNew = Date.now() - new Date(job.postedAt).getTime() < 2 * 86_400_000;

  const handleClick = (e: MouseEvent) => {
    if (onSelect && window.matchMedia("(min-width: 1024px)").matches) { e.preventDefault(); onSelect(job.id); }
  };

  return (
    <article className={cn("group relative rounded-lg border bg-surface p-4 transition-[border-color,box-shadow] duration-150 sm:p-5",
      selected ? "border-border hover:border-border-strong lg:border-primary lg:shadow-[inset_4px_0_0_rgb(var(--primary))]" : "border-border hover:border-border-strong hover:shadow-md",
      closed && "opacity-70")}>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {isNew && !closed && <p className="mb-1 text-caption font-semibold text-primary">New</p>}
          <h3 className="text-[17px] font-bold leading-6 text-ink">
            <Link to={`/worker/jobs/${job.id}`} onClick={handleClick} aria-current={selected ? "true" : undefined}
              className="after:absolute after:inset-0 after:rounded-lg group-hover:underline focus-visible:outline-none">{job.title}</Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-body text-ink">
            <span className="truncate">{job.companyName}</span>
            <VerifiedTick verified={job.companyVerified} />
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-body text-ink-secondary">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {job.location.city}, {job.location.state}{job.siteName ? ` · ${job.siteName}` : ""}
          </p>
        </div>
        <CompanyLogo job={job} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Job facts">
        <li className={cn("rounded-md px-2 py-1 text-small font-semibold", noPay ? "bg-surface-muted text-ink-muted" : "bg-success-bg text-success-fg")}>
          {formatPay(job.payMin, job.payMax, job.payPeriod)}
        </li>
        <li className="rounded-md bg-surface-muted px-2 py-1 text-small font-medium text-ink-secondary">{SHIFT_LABEL[job.shift]}</li>
        {job.benefits.slice(0, 3).map((b) => (
          <li key={b} className="rounded-md bg-surface-muted px-2 py-1 text-small font-medium text-ink-secondary">{BENEFIT_LABEL[b]}</li>
        ))}
        {job.benefits.length > 3 && <li className="rounded-md bg-surface-muted px-2 py-1 text-small font-medium text-ink-muted">+{job.benefits.length - 3}</li>}
      </ul>

      {job.jobType === "walk_in" && job.walkIn ? (
        <p className="mt-3 flex items-center gap-1.5 text-small font-medium text-interview-fg">
          <CalendarClock className="h-4 w-4" aria-hidden /> Walk-in · {formatDate(job.walkIn.date)}, {job.walkIn.time}
        </p>
      ) : !closed && !job.appliedApplicationId && (
        <p className="mt-3 flex items-center gap-1.5 text-small text-ink-secondary">
          <Zap className="h-4 w-4 text-primary" aria-hidden /> Quick apply with your profile
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-caption text-ink-muted">{timeAgo(job.postedAt)} · {job.openings} opening{job.openings === 1 ? "" : "s"}</span>
        <div className="relative z-10 flex items-center gap-1">
          {closed ? <span className="text-small font-medium text-ink-muted">Closed</span>
            : job.appliedApplicationId ? <span className="inline-flex items-center gap-1 text-small font-semibold text-success-fg"><CheckCircle2 className="h-4 w-4" aria-hidden /> Applied</span>
            : null}
          {onToggleSave && (
            <button type="button" onClick={() => onToggleSave(job)} disabled={saving} aria-pressed={job.saved}
              aria-label={job.saved ? "Remove from saved" : "Save job"} title={job.saved ? "Saved" : "Save job"}
              className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-muted", job.saved ? "text-danger-fg" : "text-ink-muted")}>
              <Heart className={cn("h-5 w-5", job.saved && "fill-current")} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
