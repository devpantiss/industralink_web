import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, Timer, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { talentApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader, StatCard } from "@/components/ui/Misc";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";

/** Hiring numbers for the company: speed, fill rate, where applicants come from, and each job's funnel. */
export default function Analytics() {
  const q = useQuery({ queryKey: qk.employer.analytics, queryFn: talentApi.analytics });
  const a = q.data;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (a && a.totalApplicants === 0) return (
    <div><PageHeader title="Analytics" /><EmptyState art="chart" title="No numbers yet" description="Numbers appear once people start applying to your jobs." /></div>
  );
  const maxState = Math.max(1, ...(a?.byState.map((s) => s.count) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="How fast you hire, and where your applicants come from." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {a ? (
          <>
            <StatCard tone="blue" label="Total applicants" value={a.totalApplicants} icon={<Users className="h-5 w-5" />} />
            <StatCard tone="green" label="% of openings filled" value={a.fillRate} icon={<CheckCircle2 className="h-5 w-5" />} hint={`On open jobs · ${a.hired} hired in total`} />
            <StatCard tone="purple" label="Avg. days to hire" value={Math.round(a.avgDaysToHire ?? 0)} icon={<Timer className="h-5 w-5" />} hint={a.avgDaysToHire === null ? "No hires yet" : "From applying to hired"} />
            <StatCard tone="amber" label="% sent a resume file" value={a.resumeShare} icon={<FileText className="h-5 w-5" />} hint="The rest applied with their profile" />
          </>
        ) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-lg" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Applicants per week" description="Last 8 weeks, all jobs" />
          <CardBody className="h-64">
            {a ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.applicantsPerWeek} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--border))" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <Tooltip cursor={{ fill: "rgb(var(--surface-muted))" }} formatter={(v: number) => [v, "Applicants"]} labelFormatter={(l) => `Week ending ${l}`}
                    contentStyle={{ borderRadius: 8, border: "1px solid rgb(var(--border))", fontSize: 13, color: "rgb(var(--text))" }} />
                  <Bar dataKey="count" name="Applicants" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Where applicants live" description="By state" />
          <CardBody>
            {a ? (
              <ul className="space-y-3">
                {a.byState.slice(0, 6).map((s) => (
                  <li key={s.state} title={`${s.state}: ${s.count} applicants`}>
                    <div className="mb-1 flex justify-between text-small"><span className="text-ink-secondary">{s.state}</span><span className="font-semibold text-ink tabular">{s.count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div className="origin-left-grow h-full rounded-full bg-primary" style={{ width: `${(s.count / maxState) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Skeleton className="h-40" />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Each job" description="How many people reached each step. Click a job to open its board." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-body">
            <thead>
              <tr className="border-b border-border text-left text-caption uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-2.5 font-semibold">Job</th>
                <th className="px-3 py-2.5 text-right font-semibold">Openings</th>
                <th className="px-3 py-2.5 text-right font-semibold">Applied</th>
                <th className="px-3 py-2.5 text-right font-semibold">Shortlisted</th>
                <th className="px-3 py-2.5 text-right font-semibold">Interview</th>
                <th className="px-5 py-2.5 text-right font-semibold">Hired</th>
              </tr>
            </thead>
            <tbody>
              {(a?.byJob ?? []).map((j) => (
                <tr key={j.jobId} className="border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="px-5 py-3"><Link to={`/employer/jobs/${j.jobId}`} className="font-medium text-ink hover:text-primary hover:underline">{j.title}</Link></td>
                  <td className="px-3 py-3 text-right tabular text-ink-secondary">{j.openings}</td>
                  <td className="px-3 py-3 text-right tabular">{j.applied}</td>
                  <td className="px-3 py-3 text-right tabular">{j.shortlisted}</td>
                  <td className="px-3 py-3 text-right tabular">{j.interview}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular">{j.hired}<span className="font-normal text-ink-muted"> / {j.openings}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
