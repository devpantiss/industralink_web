import { Link } from "react-router-dom";
import { t } from "@/lib/i18n";
import { BadgeCheck, Bookmark, CalendarClock, CheckCircle2, Clock, MapPin } from "lucide-react";
import type { JobForWorker } from "@/types";
import { EXPERIENCE_LABEL, JOB_TYPE_LABEL, SECTOR_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatCompact, formatDate, formatNumber, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CompanyLogo } from "./JobBits";

/** "₹18k–22k" plus the period, for pills and tiles. */
export function payShort(job: Pick<JobForWorker, "payMin" | "payMax" | "payPeriod">) {
  const { payMin: a, payMax: b } = job;
  if (!a && !b) return null;
  const range = a && b && a !== b ? `₹${formatCompact(a)}–${formatCompact(b)}` : `₹${formatCompact((a || b)!)}`;
  return { range, per: job.payPeriod === "day" ? t("/day") : t("/mo") };
}

/** "₹18,000 – 22,000" for rows. */
export function payLong(job: Pick<JobForWorker, "payMin" | "payMax">) {
  const { payMin: a, payMax: b } = job;
  if (!a && !b) return null;
  return a && b && a !== b ? `₹${formatNumber(a)} – ${formatNumber(b)}` : `₹${formatNumber((a || b)!)}`;
}

export function SaveButton({ job, onToggle, saving, className }: { job: JobForWorker; onToggle: (job: JobForWorker) => void; saving?: boolean; className?: string }) {
  return (
    <button type="button" onClick={() => onToggle(job)} disabled={saving} aria-pressed={job.saved}
      aria-label={job.saved ? t("Remove from saved") : t("Save job")} title={job.saved ? t("Remove from saved") : t("Save job")}
      className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-ink/[.06]", job.saved ? "text-primary" : "text-ink-secondary hover:text-ink", className)}>
      {/* key: the icon re-mounts on change, so the small pop plays once */}
      <Bookmark key={String(job.saved)} className={cn("h-[18px] w-[18px]", job.saved && "animate-tap fill-current")} aria-hidden />
    </button>
  );
}

/**
 * Job list card (grey card, white when selected). Order of importance for
 * blue-collar workers: title → pay → location → shift → company trust.
 * With `onSelect` the card picks the job (dashboard); otherwise it links to the job page.
 */
export function JobCard({ job, onToggleSave, saving, selected, onSelect }: {
  job: JobForWorker; onToggleSave?: (job: JobForWorker) => void; saving?: boolean; selected?: boolean; onSelect?: (job: JobForWorker) => void;
}) {
  const closed = job.status !== "active";
  const pay = payShort(job);
  const label = `${job.title}, ${job.companyName}`;
  return (
    <article className={cn("relative flex flex-col gap-3.5 rounded-xl border-[1.5px] p-[18px] transition-[background-color,border-color,box-shadow] duration-200",
      selected ? "border-primary bg-surface shadow-[0_10px_28px_-18px_rgb(var(--primary)/.6)]" : "border-transparent bg-surface-muted hover:bg-surface-strong",
      closed && "opacity-70")}>
      {onSelect
        ? <button type="button" onClick={() => onSelect(job)} aria-pressed={!!selected} aria-label={label} className="absolute inset-0 rounded-[inherit]" />
        : <Link to={`/worker/jobs/${job.id}`} aria-label={label} className="absolute inset-0 rounded-[inherit]" />}

      <div className="flex items-start gap-3">
        <CompanyLogo job={job} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-semibold text-ink-secondary">{job.companyName}</p>
          <h3 className="text-[16px] font-bold leading-snug tracking-tight text-ink">{job.title}</h3>
          <p className="truncate text-caption text-ink-muted">{job.location.city} · {t(SECTOR_LABEL[job.sector])}</p>
        </div>
        {onToggleSave && <SaveButton job={job} onToggle={onToggleSave} saving={saving} className="-mr-1.5 -mt-1" />}
      </div>

      <ul className="flex flex-wrap gap-1.5 text-[12.5px] font-bold text-ink">
        <li className={cn("inline-flex h-[30px] items-center whitespace-nowrap rounded-full border border-border px-2.5", selected ? "bg-surface-muted" : "bg-surface")}>
          {pay ? <>{pay.range}<span className="ml-0.5 text-caption font-medium text-ink-muted">{pay.per}</span></> : <span className="font-medium text-ink-muted">{t("Pay not shown")}</span>}
        </li>
        <li className={cn("inline-flex h-[30px] items-center whitespace-nowrap rounded-full border border-border px-2.5", selected ? "bg-surface-muted" : "bg-surface")}>{t(SHIFT_LABEL[job.shift]).replace(/ shift$/i, "")}</li>
        <li className={cn("inline-flex h-[30px] items-center whitespace-nowrap rounded-full border border-border px-2.5", selected ? "bg-surface-muted" : "bg-surface")}>{t(EXPERIENCE_LABEL[job.experience])}</li>
      </ul>

      {job.responsibilities[0] && <p className="line-clamp-2 text-small text-ink-muted">{[job.responsibilities[0], job.requirements[0]].filter(Boolean).join(". ")}.</p>}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-caption">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-ink">
          {closed ? <span className="text-ink-muted">{t("Closed")}</span>
            : job.appliedApplicationId ? <><CheckCircle2 className="h-3.5 w-3.5 text-success-fg" aria-hidden /> {t("Applied")}</>
            : job.jobType === "walk_in" && job.walkIn ? <><CalendarClock className="h-3.5 w-3.5 text-tile-purple-ink" aria-hidden /> {t("Walk-in")} · {formatDate(job.walkIn.date)}</>
            : job.companyVerified ? <><BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> {t("Verified employer")}</>
            : <span className="text-ink-muted">{t("Not yet verified")}</span>}
        </span>
        <span className="shrink-0 text-ink-muted">{timeAgo(job.postedAt)}</span>
      </div>
    </article>
  );
}

/** Wide search-result row (Find jobs). */
/** `href` overrides the link (the public jobs page opens the no-login job page). */
export function JobRow({ job, onToggleSave, saving, href }: { job: JobForWorker; onToggleSave?: (job: JobForWorker) => void; saving?: boolean; href?: string }) {
  const closed = job.status !== "active";
  const pay = payLong(job);
  const fresh = Date.now() - new Date(job.postedAt).getTime() < 86_400_000;
  return (
    <article className={cn("group relative grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5",
      closed && "opacity-70")}>
      <Link to={href ?? `/worker/jobs/${job.id}`} aria-label={`${job.title}, ${job.companyName}`} className="absolute inset-0 rounded-[inherit]" />
      <CompanyLogo job={job} size="lg" className="h-12 w-12" />
      <div className="min-w-0 space-y-2">
        <h3 className="text-[16.5px] font-bold tracking-tight text-ink group-hover:text-primary">{job.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-small text-ink-secondary">
          <span>{job.companyName}</span>
          {job.companyVerified && <BadgeCheck className="h-4 w-4 text-primary" aria-label={t("Verified")} />}
          <span className="h-[3px] w-[3px] rounded-full bg-ink-muted" aria-hidden />
          <span className="rounded-full bg-tile-yellow px-2 py-0.5 text-caption font-semibold text-tile-yellow-ink">{t(JOB_TYPE_LABEL[job.jobType === "walk_in" ? "full_time" : job.jobType])}</span>
          {job.jobType === "walk_in" && <span className="rounded-full bg-tile-purple px-2 py-0.5 text-caption font-semibold text-tile-purple-ink">{t("Walk-in")}</span>}
          {fresh && !closed && <span className="rounded-full bg-tile-rose px-2 py-0.5 text-caption font-semibold text-tile-rose-ink">{t("New")}</span>}
          {job.appliedApplicationId && <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-caption font-semibold text-success-fg"><CheckCircle2 className="h-3 w-3" aria-hidden />{t("Applied")}</span>}
        </div>
        {job.responsibilities.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-[18px] text-small text-ink-secondary">
            {job.responsibilities.slice(0, 2).map((r) => <li key={r}><span className="line-clamp-1">{r}</span></li>)}
          </ul>
        )}
        <p className="text-small text-ink-secondary">
          {pay ? <b className="text-body font-bold text-ink">{pay}</b> : <span className="text-ink-muted">{t("Salary not disclosed")}</span>}
          {pay && <> {t(job.payPeriod === "day" ? "per day" : "per month")}</>} · {t(SHIFT_LABEL[job.shift])}
        </p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 text-small sm:col-span-1 sm:flex-col sm:items-end sm:justify-between sm:text-right">
        <span className="inline-flex items-center gap-1 font-semibold text-ink"><MapPin className="h-4 w-4" aria-hidden />{job.location.city}</span>
        <span className="inline-flex items-center gap-1 text-caption text-ink-muted"><Clock className="h-3.5 w-3.5" aria-hidden />{t("Posted {when}", { when: timeAgo(job.postedAt) })}</span>
        {onToggleSave && <SaveButton job={job} onToggle={onToggleSave} saving={saving} className="-mb-1 -mr-1.5" />}
      </div>
    </article>
  );
}
