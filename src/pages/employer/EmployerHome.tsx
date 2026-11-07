import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CalendarClock, CheckCircle2, Plus, UserPlus, Users } from "lucide-react";
import { employerApi } from "@/api/employer";
import { talentApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { useUser } from "@/app/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { SHIFT_LABEL } from "@/lib/labels";
import { formatDateTime, greeting } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { VerificationBanner } from "@/components/domain/VerificationBanner";
import { CompanyLogo } from "@/components/domain/JobBits";

export default function EmployerHome() {
  const user = useUser();
  const company = useCompany();
  const s = useQuery({ queryKey: qk.employer.summary, queryFn: employerApi.summary });
  const jobs = useQuery({ queryKey: qk.employer.jobs("active"), queryFn: () => employerApi.jobs("active") });
  const analytics = useQuery({ queryKey: qk.employer.analytics, queryFn: talentApi.analytics });
  const interviews = useQuery({ queryKey: qk.employer.allCandidates({ stage: "interview" }), queryFn: () => employerApi.allCandidates({ stage: "interview" }) });
  const upcoming = (interviews.data ?? []).filter((c) => c.interview && new Date(c.interview.at) > new Date(Date.now() - 3_600_000))
    .sort((a, b) => +new Date(a.interview!.at) - +new Date(b.interview!.at)).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{greeting()}, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-body text-ink-secondary">
            {company.data ? `Hiring at ${company.data.name}` : "Your hiring"}{s.data ? ` · ${s.data.newApplicants} new applicant${s.data.newApplicants === 1 ? "" : "s"} waiting` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/employer/candidates" variant="secondary" icon={<Users className="h-4 w-4" />}>View candidates</LinkButton>
          <LinkButton to="/employer/jobs/new" icon={<Plus className="h-4 w-4" />}>Post a job</LinkButton>
        </div>
      </div>
      <VerificationBanner />

      {s.isError ? <ErrorState onRetry={() => s.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {s.data ? (
            <>
              <Stat to="/employer/jobs" tone="bg-tile-blue text-tile-blue-ink" icon={Briefcase} label="Open jobs" value={s.data.openJobs} />
              <Stat to="/employer/candidates?stage=applied" tone="bg-tile-green text-tile-green-ink" icon={UserPlus} label="New applicants" value={s.data.newApplicants} note={s.data.newApplicants ? "To review" : undefined} />
              <Stat to="/employer/candidates?stage=interview" tone="bg-tile-purple text-tile-purple-ink" icon={CalendarClock} label="Interviews this week" value={s.data.interviewsThisWeek} />
              <Stat to="/employer/candidates?stage=hired" tone="bg-tile-orange text-tile-orange-ink" icon={CheckCircle2} label="Hired this month" value={s.data.hiredThisMonth} />
            </>
          ) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-lg" />)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-border p-5">
          <div className="mb-4 flex items-baseline justify-between gap-2"><h2 className="text-h3 font-bold">Applicants per day</h2><span className="text-caption text-ink-muted">This week · hover a bar</span></div>
          {s.data ? <BarChart data={s.data.applicantsPerDay} /> : <Skeleton className="h-[200px]" />}
        </section>

        <section className="rounded-lg border border-border p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-h3 font-bold">Upcoming interviews</h2>
            <Link to="/employer/candidates?stage=interview" className="text-small font-semibold text-primary hover:underline">View all</Link>
          </div>
          {interviews.isLoading ? <Skeleton className="h-40" /> : upcoming.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-4 py-8 text-center text-small text-ink-muted">No interviews scheduled. Shortlist workers and invite them from a job.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <Link to={`/employer/jobs/${c.jobId}?c=${c.id}`} className="flex items-center gap-3 rounded-xl bg-surface-muted p-3 transition-colors hover:bg-surface-strong">
                    <Avatar name={c.worker.name} src={c.worker.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-bold text-ink">{c.worker.name}</span>
                      <span className="block truncate text-caption text-ink-muted">{c.jobTitle}</span>
                    </span>
                    <span className="shrink-0 text-right text-caption font-semibold text-tile-purple-ink">{formatDateTime(c.interview!.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-border">
          <h2 className="border-b border-border px-5 py-4 text-h3 font-bold">Needs your attention</h2>
          {s.isLoading ? <div className="p-5"><Skeleton className="h-24" /></div> : s.data?.attention.length ? (
            <ul className="divide-y divide-border">
              {s.data.attention.map((a) => (
                <li key={a.id}>
                  <Link to={a.link} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="flex-1 text-body text-ink">{a.text}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-primary">{a.action} <ArrowRight className="h-4 w-4" aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-body text-ink-muted">All caught up.</p>}
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-4 text-h3 font-bold">Hiring funnel <span className="text-small font-normal text-ink-muted">· all jobs</span></h2>
          {s.data ? (
            <ul className="space-y-3.5">
              {s.data.funnel.map((f, i) => {
                const max = Math.max(1, s.data!.funnel[0]!.count);
                const colors = ["bg-tile-blue-ink", "bg-primary", "bg-tile-purple-ink", "bg-tile-green-ink"];
                return (
                  <li key={f.stage}>
                    <div className="mb-1 flex justify-between text-small"><span className="text-ink-secondary">{f.stage}</span><b className="tabular">{f.count}</b></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-strong"><div className={cn("origin-left-grow h-full rounded-full", colors[i])} style={{ width: `${(f.count / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : <Skeleton className="h-32" />}
        </section>
      </div>

      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="text-h3 font-bold">Open jobs</h2>
          <Link to="/employer/jobs" className="text-small font-semibold text-primary hover:underline">View all</Link>
        </div>
        {jobs.isLoading ? <div className="p-5"><Skeleton className="h-28" /></div> : !jobs.data?.length ? (
          <p className="px-5 py-8 text-center text-body text-ink-muted">No open jobs. <Link className="font-semibold text-primary hover:underline" to="/employer/jobs/new">Post your first job</Link></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-small">
              <thead className="text-caption font-semibold text-ink-muted">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-semibold">Job</th><th className="px-3 py-3 font-semibold">Applicants</th><th className="px-3 py-3 font-semibold">Shortlisted</th><th className="px-3 py-3 font-semibold">Openings filled</th><th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.slice(0, 6).map((j) => {
                  const a = analytics.data?.byJob.find((b) => b.jobId === j.id);
                  const hired = a?.hired ?? 0;
                  return (
                    <tr key={j.id} className="group relative border-b border-border last:border-0 hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <Link to={`/employer/jobs/${j.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                          <CompanyLogo job={j} size="sm" />
                          <span className="min-w-0"><span className="block truncate font-bold text-ink group-hover:text-primary">{j.title}</span><span className="block truncate text-caption text-ink-muted">{j.location.city} · {SHIFT_LABEL[j.shift]}</span></span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 tabular">{j.applicantsCount}{j.newApplicantsCount > 0 && <span className="ml-2 rounded-full bg-primary px-1.5 py-px text-[11px] font-bold text-white">{j.newApplicantsCount} new</span>}</td>
                      <td className="px-3 py-3 tabular">{a ? a.shortlisted : "–"}</td>
                      <td className="px-3 py-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-strong"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (hired / Math.max(1, j.openings)) * 100)}%` }} /></div>
                        <span className="mt-1 block text-caption text-ink-muted tabular">{hired} of {j.openings}</span>
                      </td>
                      <td className="px-5 py-3"><JobStatusBadge status={j.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ to, tone, icon: Icon, label, value, note }: { to: string; tone: string; icon: typeof Briefcase; label: string; value: number; note?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3.5 rounded-lg border border-border p-4 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block truncate text-small text-ink-secondary">{label}</span>
        <span className="flex items-baseline gap-2"><b className="text-[26px] font-extrabold leading-tight tabular">{value}</b>{note && <span className="text-caption font-semibold text-success-fg">{note}</span>}</span>
      </span>
    </Link>
  );
}

/** Simple bar chart drawn to scale; the last bar (today) is highlighted and labelled. */
function BarChart({ data }: { data: { day: string; count: number }[] }) {
  const peak = Math.max(1, ...data.map((d) => d.count));
  const top = peak <= 4 ? 4 : Math.ceil(peak / 4) * 4;
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
      <div className="relative h-[180px] text-[11px] text-ink-muted">
        {[top, top / 2, 0].map((v, i) => <span key={i} className="absolute right-0 translate-y-1/2 tabular" style={{ bottom: `${(v / top) * 100}%` }}>{v}</span>)}
      </div>
      <div className="relative flex h-[180px] items-end gap-2">
        {[0, 50, 100].map((p) => <span key={p} className={cn("absolute inset-x-0 border-t border-border", p !== 0 && "border-dashed")} style={{ bottom: `${p}%` }} aria-hidden />)}
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <div key={d.day} className="group relative flex h-full flex-1 items-end">
              <div className={cn("relative w-full origin-bottom rounded-t-md transition-colors", last ? "bg-primary" : "bg-tile-blue group-hover:bg-[#BFD9F2]")} style={{ height: `${(d.count / top) * 100}%`, minHeight: d.count ? 4 : 0 }}>
                <span className={cn("absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white transition-opacity", last ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{d.count}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div />
      <div className="flex gap-2 text-center text-[11px] text-ink-muted">{data.map((d) => <span key={d.day} className="flex-1 truncate">{d.day}</span>)}</div>
    </div>
  );
}
