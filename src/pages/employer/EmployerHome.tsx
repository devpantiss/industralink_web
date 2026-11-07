import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CalendarClock, CheckCircle2, Plus, UserPlus } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Hero, StatCard } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { VerificationBanner } from "@/components/domain/VerificationBanner";
import { timeAgo } from "@/lib/format";

export default function EmployerHome() {
  const company = useCompany();
  const s = useQuery({ queryKey: qk.employer.summary, queryFn: employerApi.summary });
  const jobs = useQuery({ queryKey: qk.employer.jobs("active"), queryFn: () => employerApi.jobs("active") });

  return (
    <div className="space-y-6">
      <Hero image="/media/hero-employer.jpg" eyebrow="Hiring dashboard" title={`Welcome back${company.data ? `, ${company.data.name}` : ""}`}
        subtitle={s.data?.newApplicants ? `${s.data.newApplicants} new applicants are waiting for you.` : "Today's hiring at a glance."}
        actions={<>
          <LinkButton to="/employer/candidates" variant="secondary" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">View candidates</LinkButton>
          <LinkButton to="/employer/jobs/new" variant="accent" size="lg" icon={<Plus className="h-5 w-5" />}>Post a job</LinkButton>
        </>} />
      <VerificationBanner />

      {s.isError ? <ErrorState onRetry={() => s.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {s.data ? (
            <>
              <StatCard tone="blue" label="Open jobs" value={s.data.openJobs} icon={<Briefcase className="h-5 w-5" />} to="/employer/jobs" />
              <StatCard tone="amber" label="New applicants" value={s.data.newApplicants} icon={<UserPlus className="h-5 w-5" />} highlight={s.data.newApplicants > 0} to="/employer/candidates?stage=applied" />
              <StatCard tone="purple" label="Interviews this week" value={s.data.interviewsThisWeek} icon={<CalendarClock className="h-5 w-5" />} to="/employer/candidates?stage=interview" />
              <StatCard tone="green" label="Hired this month" value={s.data.hiredThisMonth} icon={<CheckCircle2 className="h-5 w-5" />} to="/employer/candidates?stage=hired" />
            </>
          ) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-lg" />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Needs your attention" />
          {s.isLoading ? <CardBody><Skeleton className="h-24" /></CardBody> : s.data?.attention.length ? (
            <ul className="divide-y divide-border">
              {s.data.attention.map((a) => (
                <li key={a.id}>
                  <Link to={a.link} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="flex-1 text-body text-ink">{a.text}</span>
                    <span className="inline-flex items-center gap-1 text-small font-medium text-primary">{a.action} <ArrowRight className="h-4 w-4" aria-hidden /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <CardBody><p className="py-6 text-center text-body text-ink-muted">All caught up 🎉</p></CardBody>}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Hiring funnel" description="All your jobs" />
          <CardBody className="space-y-3">
            {s.data ? s.data.funnel.map((f, i) => {
              const max = Math.max(1, s.data!.funnel[0]!.count);
              const colors = ["bg-slate-500", "bg-primary", "bg-violet-600", "bg-green-600"];
              return (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-small"><span className="text-ink-secondary">{f.stage}</span><span className="font-semibold tabular">{f.count}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`origin-left-grow h-full rounded-full ${colors[i]}`} style={{ width: `${(f.count / max) * 100}%`, animationDelay: `${i * 80}ms` }} />
                  </div>
                </div>
              );
            }) : <Skeleton className="h-32" />}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader title="Applicants this week" />
          <CardBody className="h-56">
            {s.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.data.applicantsPerDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <Tooltip cursor={{ fill: "rgb(var(--surface-muted))" }} contentStyle={{ borderRadius: 8, border: "1px solid rgb(var(--border))", fontSize: 13 }} />
                  <Bar dataKey="count" name="Applicants" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Open jobs" action={<Link to="/employer/jobs" className="text-small font-medium text-primary hover:underline">View all</Link>} />
        {jobs.data?.length === 0 ? (
          <CardBody><p className="py-6 text-center text-body text-ink-muted">No open jobs. <Link className="text-primary hover:underline" to="/employer/jobs/new">Post your first job</Link></p></CardBody>
        ) : (
          <ul className="divide-y divide-border">
            {(jobs.data ?? []).slice(0, 5).map((j) => (
              <li key={j.id}>
                <Link to={`/employer/jobs/${j.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">{j.title}</p>
                    <p className="text-small text-ink-muted">{j.location.city} · posted {timeAgo(j.postedAt)}</p>
                  </div>
                  <span className="text-small text-ink-secondary tabular">{j.applicantsCount} applicants</span>
                  {j.newApplicantsCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-white tabular">{j.newApplicantsCount} new</span>}
                  <JobStatusBadge status={j.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
