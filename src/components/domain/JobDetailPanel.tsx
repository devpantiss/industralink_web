import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, CalendarClock, CheckCircle2, Clock, Flag, Globe, MapPin, MessageCircle, Phone, Share2, ShieldCheck, Users } from "lucide-react";
import type { JobForWorker } from "@/types";
import { EXPERIENCE_LABEL, HIRING_TYPE_LABEL, PAY_TYPE_LABEL, SECTOR_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatDate, formatPay, timeAgo } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { useSlideIndicator } from "@/hooks/useSlideIndicator";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/States";
import { BenefitChips, CompanyLogo, jobTypeText, walkInWhen } from "./JobBits";
import { payShort, SaveButton } from "./JobCard";

type Tab = "description" | "company";

export function isJobClosed(job: JobForWorker) {
  return job.status !== "active" || (!!job.deadline && new Date(job.deadline) < new Date());
}

export function shareJob(job: JobForWorker) {
  const text = `${job.title} at ${job.companyName}, ${job.location.city}. ${formatPay(job.payMin, job.payMax, job.payPeriod)}. ${window.location.origin}/jobs/${job.id}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Full job details: header, four fact tiles, Description / Company switch, Apply.
 * Used in the dashboard (right column), the job page and on phones.
 */
export function JobDetailPanel({ job, onToggleSave, saving, onApply, onReport, className }: {
  job: JobForWorker; onToggleSave: (job: JobForWorker) => void; saving?: boolean; onApply: () => void; onReport: () => void; className?: string;
}) {
  const [tab, setTab] = useState<Tab>("description");
  const { box, ind } = useSlideIndicator<HTMLDivElement>("x", [tab]);
  const toast = useToast();
  const closed = isJobClosed(job);
  const pay = payShort(job);

  const copyLink = async () => {
    const url = `${window.location.origin}/jobs/${job.id}`;
    try { await navigator.clipboard.writeText(url); toast.success(t("Job link copied")); } catch { toast.error(url); }
  };

  return (
    <div className={cn("space-y-5", className)}>
      <header className="flex items-start gap-4">
        <CompanyLogo job={job} size="lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/worker/companies/${job.companyId}`} className="inline-flex items-center gap-1 text-small font-semibold text-ink-secondary hover:text-primary">
            {job.companyName} {job.companyVerified && <BadgeCheck className="h-4 w-4 text-primary" aria-label={t("Verified")} />}
          </Link>
          <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">{job.title}</h2>
          <p className="mt-0.5 text-small text-ink-muted">{job.siteName ? `${job.siteName}, ` : ""}{job.location.city}, {job.location.state} · {t("Posted {when}", { when: timeAgo(job.postedAt) })}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={copyLink} aria-label={t("Copy job link")} title={t("Copy job link")} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink/[.06] hover:text-ink"><Share2 className="h-[18px] w-[18px]" aria-hidden /></button>
          <SaveButton job={job} onToggle={onToggleSave} saving={saving} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile tone="bg-tile-green text-tile-green-ink" label={job.payType && pay ? `${t("Salary")} · ${t(PAY_TYPE_LABEL[job.payType])}` : t("Salary")} value={pay ? <>{pay.range}<small className="ml-0.5 text-[11px] font-semibold opacity-75">{pay.per}</small></> : t("Not shown")} />
        <Tile tone="bg-tile-blue text-tile-blue-ink" label={t("Shift")} value={t(SHIFT_LABEL[job.shift]).replace(/ shift$/i, "")} />
        <Tile tone="bg-tile-orange text-tile-orange-ink" label={t("Openings")} value={<>{job.openings}<small className="ml-1 text-[11px] font-semibold opacity-75">{t("{n} applied", { n: job.applicantsCount })}</small></>} />
        <Tile tone="bg-tile-purple text-tile-purple-ink" label={t("Experience")} value={t(EXPERIENCE_LABEL[job.experience])} />
      </dl>

      <div ref={box} role="tablist" aria-label={t("Job information")} className="relative grid grid-cols-2 gap-2">
        <span ref={ind} className="slide-ind absolute left-0 top-0 h-[46px] w-0 rounded-full bg-ink-fill" aria-hidden />
        {(["description", "company"] as Tab[]).map((v) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn("relative z-10 h-[46px] rounded-full text-body font-semibold transition-colors", tab === v ? "text-on-ink" : "bg-surface text-ink-secondary hover:text-ink")}>
            {v === "description" ? t("Description") : t("Company")}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise min-h-[180px] space-y-5">
        {tab === "description" ? <DescriptionTab job={job} /> : <CompanyTab job={job} />}
      </div>

      <div className="space-y-3">
        {closed ? (
          <p className="flex h-[54px] items-center justify-center rounded-full bg-surface-strong text-body font-semibold text-ink-muted">{t("This job is closed")}</p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
            {job.appliedApplicationId ? (
              <Link to={`/worker/applications/${job.appliedApplicationId}`} className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-success-bg text-body-lg font-bold text-success-fg transition-colors hover:bg-success-bg/70">
                <svg viewBox="0 0 24 24" className="draw-check h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" pathLength="1" /></svg>
                {t("Applied · Track it")}
              </Link>
            ) : (
              <button type="button" onClick={onApply} className="h-[54px] rounded-full bg-primary text-body-lg font-bold text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.99]">{t("Apply now")}</button>
            )}
            <a href={shareJob(job)} target="_blank" rel="noreferrer" className="inline-flex h-[54px] items-center gap-2 rounded-full border border-border bg-surface px-5 text-body font-semibold text-ink transition-colors hover:bg-surface-strong">
              <MessageCircle className="h-[18px] w-[18px] text-[#1FA855]" aria-hidden /> <span className="hidden sm:inline">{t("Share")}</span>
            </a>
          </div>
        )}
        {!closed && !job.appliedApplicationId && <p className="text-center text-small text-ink-muted">{t("No resume needed. Your IndustriaLink profile is sent to the employer.")}</p>}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">{t("IndustriaLink never asks for money.")} {t("Don't pay anyone for a job or \"registration\".")}</span>
          <button type="button" onClick={onReport} className="inline-flex items-center gap-1 font-semibold text-ink-secondary underline-offset-2 hover:text-danger-fg hover:underline"><Flag className="h-3.5 w-3.5" aria-hidden />{t("Report job")}</button>
        </p>
      </div>
    </div>
  );
}

function Tile({ tone, label, value }: { tone: string; label: string; value: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-3 text-center", tone)}>
      <dt className="text-[11.5px] font-semibold opacity-80">{label}</dt>
      <dd className="mt-0.5 max-w-full truncate text-[17px] font-extrabold tracking-tight">{value}</dd>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-h3 font-bold text-ink">{title}</h3>
      <ul className="list-disc space-y-1 pl-[18px] text-body text-ink-secondary">{items.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}

function DescriptionTab({ job }: { job: JobForWorker }) {
  const walkInOver = job.jobType === "walk_in" && job.walkIn && new Date(`${job.walkIn.endDate || job.walkIn.date}T23:59`) < new Date();
  const place = [job.siteName, job.address, job.location.city, job.location.state, job.pincode].filter(Boolean).join(", ");
  return (
    <>
      {job.jobType === "walk_in" && job.walkIn && (
        <div className={cn("flex items-start gap-3 rounded-xl p-4 text-small", walkInOver ? "bg-surface-strong text-ink-muted" : "bg-tile-purple text-tile-purple-ink")}>
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-bold">{t("Walk-in interview")}{walkInOver ? ` · ${t("The walk-in date is over.")}` : ""}</p>
            {!walkInOver && <>
              <p>{walkInWhen(job.walkIn)} · {job.walkIn.address}</p>
              {job.walkIn.contactPerson && <p>{t("Ask for")}: {job.walkIn.contactPerson}</p>}
              {job.walkIn.bring && <p>{t("Bring")}: {job.walkIn.bring}</p>}
              <a className="mt-1 inline-block font-semibold underline underline-offset-2" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(job.walkIn.address)}`}>{t("Open in Maps")}</a>
            </>}
          </div>
        </div>
      )}
      <List title={t("Job description")} items={job.responsibilities} />
      <List title={t("Requirements")} items={[...job.requirements,
        ...(job.qualifications.length ? [`${t("Qualification")}: ${job.qualifications.join(", ")}`] : []),
        ...(job.licences?.length ? [`${t("Licence needed")}: ${job.licences.join(", ")}`] : [])]} />
      {job.benefits.length > 0 && (
        <div>
          <h3 className="mb-2 text-h3 font-bold text-ink">{t("Facilities")}</h3>
          <BenefitChips benefits={job.benefits} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Fact icon={MapPin} label={t("Work location")} value={place}
          link={job.address ? { href: `https://maps.google.com/?q=${encodeURIComponent(place)}`, label: t("Open in Maps") } : undefined} />
        <Fact icon={Building2} label={t("Job type")} value={jobTypeText(job)} />
        {job.workHours && <Fact icon={Clock} label={t("Working hours")} value={job.workHours} />}
        {job.deadline && <Fact icon={CalendarClock} label={t("Last date to apply")} value={formatDate(job.deadline)} />}
        <Fact icon={Phone} label={t("HR contact")} value={job.allowCalls ? `${t("After you're shortlisted")}${job.callHours ? ` · ${job.callHours}` : ""}` : t("The employer will contact you if you're shortlisted.")} />
      </div>
    </>
  );
}

function Fact({ icon: Icon, label, value, link }: { icon: typeof MapPin; label: string; value: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary"><Icon className="h-4 w-4" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-caption text-ink-muted">{label}</p>
        <p className="text-small font-semibold text-ink">{value}</p>
        {link && <a href={link.href} target="_blank" rel="noreferrer" className="text-caption font-semibold text-primary hover:underline">{link.label}</a>}
      </div>
    </div>
  );
}

function CompanyTab({ job }: { job: JobForWorker }) {
  const q = useQuery({ queryKey: qk.worker.company(job.companyId), queryFn: () => workerApi.company(job.companyId) });
  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-16" /><Skeleton className="h-24" /></div>;
  if (!q.data) return <p className="text-body text-ink-muted">{t("We couldn't load this. Please try again.")}</p>;
  const { company: c, jobs } = q.data;
  const others = jobs.filter((j) => j.id !== job.id);
  return (
    <>
      <div>
        <h3 className="mb-2 text-h3 font-bold text-ink">{t("About {company}", { company: c.name })}</h3>
        <p className="text-body text-ink-secondary">{c.about || t("This company hasn't added a description yet.")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        <CoFact label={t("Industry")} value={t(SECTOR_LABEL[c.sector])} />
        <CoFact label={t("Workers")} value={<span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-ink-muted" aria-hidden />{c.size}</span>} />
        <CoFact label={t("Location")} value={`${c.location.city}, ${c.location.state}`} />
        {c.hiringType && <CoFact label={t("Hiring as")} value={t(HIRING_TYPE_LABEL[c.hiringType])} />}
        <CoFact label={t("Verified")} value={c.verification === "approved"
          ? <span className="inline-flex items-center gap-1.5 text-success-fg"><CheckCircle2 className="h-4 w-4" aria-hidden />{t("Verified by IndustriaLink")}</span>
          : <span className="text-warning-fg">{t("Not yet verified")}</span>} />
        {c.website && <CoFact label={t("Website")} value={<span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4 text-ink-muted" aria-hidden />{c.website}</span>} />}
      </dl>
      {others.length > 0 && (
        <div>
          <h3 className="mb-2 text-h3 font-bold text-ink">{t("More jobs here")}</h3>
          <ul className="space-y-2">
            {others.slice(0, 4).map((o) => {
              const p = payShort(o);
              return (
                <li key={o.id}>
                  <Link to={`/worker/jobs/${o.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong">
                    <CompanyLogo job={o} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{o.title}</span>
                      <span className="block truncate text-caption text-ink-muted">{p ? `${p.range}${p.per}` : t("Pay not shown")} · {t(SHIFT_LABEL[o.shift])}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Link to={`/worker/companies/${c.id}`} className="inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline">{t("See company page")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
    </>
  );
}

function CoFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-small font-semibold text-ink">{value}</dd>
    </div>
  );
}
