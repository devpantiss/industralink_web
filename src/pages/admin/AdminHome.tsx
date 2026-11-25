import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Briefcase, Building2, HardHat } from "lucide-react";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/admin";
import { qk } from "@/api/keys";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Hero, StatCard } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";

export default function AdminHome() {
  const q = useQuery({ queryKey: qk.admin.summary, queryFn: adminApi.summary });
  const s = q.data;
  return (
    <div className="space-y-6">
      <Hero image="/media/hero-admin.jpg" eyebrow="Admin" title="Platform overview" subtitle="Keep IndustriaLink trusted: approve real companies and remove bad jobs."
        actions={s && s.pendingVerifications > 0 ? <LinkButton to="/admin/verifications" variant="accent" size="lg">Review {s.pendingVerifications} {s.pendingVerifications === 1 ? "company" : "companies"}</LinkButton> : undefined} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {s ? (
            <>
              <StatCard tone="blue" label="Workers" value={s.workers} icon={<HardHat className="h-5 w-5" />} to="/admin/users" />
              <StatCard tone="teal" label="Companies" value={s.companies} icon={<Building2 className="h-5 w-5" />} to="/admin/users?role=employer" />
              <StatCard tone="purple" label="Active jobs" value={s.activeJobs} icon={<Briefcase className="h-5 w-5" />} to="/admin/jobs" />
              <StatCard tone="amber" label="Waiting for approval" value={s.pendingVerifications} icon={<BadgeCheck className="h-5 w-5" />} to="/admin/verifications" highlight={s.pendingVerifications > 0} />
            </>
          ) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-lg" />)}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Action required" />
          {!s ? <CardBody><Skeleton className="h-24" /></CardBody> : s.attention.length === 0 ? (
            <EmptyState compact art="done" title="All caught up" />
          ) : (
            <ul className="divide-y divide-border">
              {s.attention.map((a) => (
                <li key={a.id}>
                  <Link to={a.link} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="flex-1 text-body">{a.text}</span>
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Sign-ups per week" />
          <CardBody className="h-64">
            {s ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.signupsPerWeek} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="rgb(var(--text-muted))" />
                  <Tooltip cursor={{ fill: "rgb(var(--surface-muted))" }} contentStyle={{ borderRadius: 8, border: "1px solid rgb(var(--border))", fontSize: 13 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="workers" name="Workers" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="companies" name="Companies" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
