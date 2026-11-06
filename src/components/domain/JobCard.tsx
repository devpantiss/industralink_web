import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock, Heart, MapPin, Users, Wallet } from "lucide-react";
import type { JobForWorker } from "@/types";
import { EXPERIENCE_LABEL, SECTOR_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatDate, formatPay, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { VerifiedTick } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { BenefitChips, CompanyLogo } from "./JobBits";

/**
 * The most important component. Order of importance for blue-collar workers:
 * title → pay → location → shift → benefits → company trust → meta.
 */
export function JobCard({ job, onToggleSave, saving }: { job: JobForWorker; onToggleSave?: (job: JobForWorker) => void; saving?: boolean }) {
  const closed = job.status !== "active";
  const noPay = !job.payMin && !job.payMax;
  return (
    <article className={cn("relative rounded-lg border border-border bg-surface p-4 shadow-xs transition-[box-shadow,transform,border-color] duration-200 ease-brand hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5", closed && "opacity-70")}>
      <div className="flex gap-3">
        <CompanyLogo job={job} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-h3 text-ink">
              <Link to={`/worker/jobs/${job.id}`} className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-none">{job.title}</Link>
            </h3>
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(job)}
                disabled={saving}
                aria-pressed={job.saved}
                aria-label={job.saved ? "Remove from saved" : "Save job"}
                className={cn("relative z-10 -m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-muted", job.saved ? "text-danger-fg" : "text-ink-muted")}
              >
                <Heart className={cn("h-5 w-5", job.saved && "fill-current")} />
              </button>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-small text-ink-secondary">
            <span className="truncate">{job.companyName}</span>
            <VerifiedTick verified={job.companyVerified} />
          </p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-body text-ink sm:grid-cols-2">
        <li className={cn("flex items-center gap-2 font-semibold", noPay && "font-normal text-ink-muted")}>
          <Wallet className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden /> {formatPay(job.payMin, job.payMax, job.payPeriod)}
        </li>
        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden /> {job.location.city}, {job.location.state}</li>
        <li className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden /> {SHIFT_LABEL[job.shift]}</li>
        <li className="flex items-center gap-2 text-ink-secondary"><Users className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden /> {job.openings} openings · {EXPERIENCE_LABEL[job.experience]}</li>
      </ul>

      <BenefitChips benefits={job.benefits} max={4} className="mt-3" />

      {job.jobType === "walk_in" && job.walkIn && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-interview-bg px-2 py-1 text-small font-medium text-interview-fg">
          <CalendarClock className="h-4 w-4" aria-hidden /> Walk-in · {formatDate(job.walkIn.date)}, {job.walkIn.time}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-caption text-ink-muted">{SECTOR_LABEL[job.sector]}{job.siteName ? ` · ${job.siteName}` : ""} · {timeAgo(job.postedAt)}</span>
        <div className="relative z-10 flex items-center gap-2">
          {closed ? (
            <span className="text-small font-medium text-ink-muted">Closed</span>
          ) : job.appliedApplicationId ? (
            <span className="inline-flex items-center gap-1 text-small font-medium text-success-fg"><CheckCircle2 className="h-4 w-4" aria-hidden /> Applied</span>
          ) : (
            <Link to={`/worker/jobs/${job.id}?apply=1`} className={buttonClass("primary", "sm")}>Apply now</Link>
          )}
        </div>
      </div>
    </article>
  );
}
