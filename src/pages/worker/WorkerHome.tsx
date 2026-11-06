import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, CalendarClock, ChevronRight, FileText, MapPin, Search, ShieldCheck } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { useUser } from "@/app/AuthContext";
import { greeting, formatDateTime, timeAgo } from "@/lib/format";
import { EXPERIENCE_LABEL, TRADE_LABEL } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Misc";
import { Button, LinkButton } from "@/components/ui/Button";
import { StageBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";

/** Circular "profile complete" meter, like Naukri's. */
function ProfileRing({ value }: { value: number }) {
  const r = 34, len = 2 * Math.PI * r;
  const color = value >= 80 ? "rgb(var(--success-fg))" : value >= 50 ? "rgb(var(--primary))" : "rgb(var(--accent))";
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" role="img" aria-label={`Profile ${value}% complete`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(var(--surface-muted))" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)}
        style={{ ["--ring-len" as string]: len, animation: "ring-draw 800ms cubic-bezier(.2,0,0,1) both" }} />
    </svg>
  );
}

export default function WorkerHome() {
  const user = useUser();
  const navigate = useNavigate();
  const summary = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const apps = useQuery({ queryKey: qk.worker.applications, queryFn: workerApi.applications });
  const jobs = useQuery({
    queryKey: qk.worker.jobs({ forYou: profile.data?.trade }),
    queryFn: () => workerApi.searchJobs({ trade: profile.data?.trade, sort: "nearest" }),
    enabled: profile.isSuccess,
  });
  const fallback = useQuery({
    queryKey: qk.worker.jobs({ latest: true }),
    queryFn: () => workerApi.searchJobs({ sort: "newest" }),
    enabled: jobs.isSuccess && jobs.data.items.length === 0,
  });
  const { toggle, pendingId } = useSaveJob();
  const [q, setQ] = useState("");
  const s = summary.data;
  const p = profile.data;
  const list = (jobs.data?.items.length ? jobs.data.items : fallback.data?.items ?? []).slice(0, 6);
  const recentApps = (apps.data ?? []).filter((a) => a.stage !== "withdrawn").slice(0, 4);

  const search = (e: FormEvent) => { e.preventDefault(); navigate(`/worker/jobs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      {/* Left: profile card */}
      <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-[84px] lg:self-start">
        <Card className="p-5">
          <div className="flex items-center gap-4 lg:flex-col lg:text-center">
            <div className="relative shrink-0">
              {s ? <ProfileRing value={s.profileStrength} /> : <Skeleton className="h-20 w-20 rounded-full" />}
              <span className="absolute inset-0 flex items-center justify-center"><Avatar name={user.name} size="lg" /></span>
              {s && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-1.5 text-caption font-bold text-ink tabular">{s.profileStrength}%</span>}
            </div>
            <div className="min-w-0">
              <p className="truncate text-h2 text-ink">{user.name}</p>
              <p className="text-body text-ink-secondary">{p?.trade ? TRADE_LABEL[p.trade] : "Add your trade"}{p?.experience ? ` · ${EXPERIENCE_LABEL[p.experience]}` : ""}</p>
              {p?.location?.city && <p className="mt-0.5 flex items-center gap-1 text-small text-ink-muted lg:justify-center"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.location.city}</p>}
            </div>
          </div>
          <LinkButton to={s?.missing[0]?.link ?? "/worker/profile"} variant={s?.missing.length ? "primary" : "secondary"} className="mt-4 w-full">
            {s?.missing.length ? "Complete profile" : "View profile"}
          </LinkButton>
          {s && s.missing.length > 0 && <p className="mt-2 text-center text-caption text-ink-muted">{s.missing.length} thing{s.missing.length === 1 ? "" : "s"} left · complete profiles get more calls</p>}
        </Card>

        <Card className="divide-y divide-border overflow-hidden">
          {[
            { label: "Applied", value: s?.activeApplications, to: "/worker/applications", icon: FileText },
            { label: "Interviews", value: s?.interviews, to: "/worker/applications?tab=interviews", icon: CalendarClock },
            { label: "Saved jobs", value: s?.saved, to: "/worker/saved", icon: Bookmark },
          ].map((x) => (
            <Link key={x.label} to={x.to} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted">
              <x.icon className="h-5 w-5 text-ink-muted" aria-hidden />
              <span className="flex-1 text-body font-medium text-ink">{x.label}</span>
              <span className="text-body font-bold text-ink tabular">{x.value ?? "–"}</span>
              <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </Card>
      </aside>

      {/* Middle: search, next step, recommended jobs */}
      <div className="order-1 min-w-0 space-y-5 lg:order-none">
        <div>
          <h1 className="text-h1 text-ink">{greeting()}, {user.name.split(" ")[0]}</h1>
          <p className="text-body text-ink-secondary">{s?.nextStep ? "You have an interview coming up. Good luck!" : "New jobs from verified companies are added every day."}</p>
        </div>

        <form onSubmit={search} role="search" className="flex items-center gap-2 rounded-full border border-border-strong bg-surface p-1.5 pl-4 shadow-[0_2px_8px_rgb(0_0_0/.05)]">
          <Search className="h-5 w-5 shrink-0 text-ink" aria-hidden />
          <label className="sr-only" htmlFor="home-q">Search jobs</label>
          <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, e.g. welder, driver" className="h-10 min-w-0 flex-1 bg-transparent text-body-lg placeholder:text-ink-muted focus:outline-none" />
          <Button type="submit">Search</Button>
        </form>

        {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}

        {s?.nextStep && (
          <Card className="animate-rise flex flex-col gap-4 border-interview-fg/25 p-5 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-interview-bg text-interview-fg"><CalendarClock className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-interview-fg">Next step</p>
              <p className="text-h3 text-ink">{s.nextStep.title}{s.nextStep.at ? ` · ${formatDateTime(s.nextStep.at)}` : ""}</p>
              <p className="text-body text-ink-secondary">{s.nextStep.subtitle}</p>
            </div>
            <LinkButton to={s.nextStep.link} variant="secondary">View details</LinkButton>
          </Card>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-h2">{jobs.data?.items.length ? "Recommended jobs" : "New jobs"}</h2>
              {jobs.data?.items.length && p?.trade ? <p className="text-small text-ink-muted">Based on your trade ({TRADE_LABEL[p.trade]}) and location</p> : null}
            </div>
            <Link to="/worker/jobs" className="inline-flex items-center gap-1 text-body font-semibold text-primary hover:underline">View all <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          {jobs.isLoading || profile.isLoading ? <ListSkeleton count={2} /> : jobs.isError ? <ErrorState onRetry={() => jobs.refetch()} /> : list.length === 0 ? (
            <EmptyState title="No jobs yet" description="New jobs are added every day. Check back soon." action={<LinkButton to="/worker/jobs">Browse all jobs</LinkButton>} />
          ) : (
            <div className="stagger grid gap-3 md:grid-cols-2">
              {list.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}
            </div>
          )}
        </section>
      </div>

      {/* Right: application status + safety */}
      <aside className="order-3 space-y-4 lg:order-none lg:col-start-2 xl:col-start-auto xl:sticky xl:top-[84px] xl:self-start">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-h3">Your applications</h2>
            <Link to="/worker/applications" className="text-small font-semibold text-primary hover:underline">See all</Link>
          </div>
          {apps.isLoading ? <div className="p-5"><Skeleton className="h-20" /></div> : recentApps.length === 0 ? (
            <p className="px-5 py-6 text-center text-body text-ink-muted">You haven't applied yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentApps.map((a) => (
                <li key={a.id}>
                  <Link to={`/worker/applications/${a.id}`} className="block px-5 py-3 hover:bg-surface-muted">
                    <p className="truncate text-body font-semibold text-ink">{a.job.title}</p>
                    <p className="truncate text-small text-ink-secondary">{a.job.companyName}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <StageBadge stage={a.stage} audience="worker" />
                      <span className="text-caption text-ink-muted">{timeAgo(a.appliedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex gap-3 p-5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-success-fg" aria-hidden />
          <div>
            <p className="text-body font-semibold text-ink">Never pay for a job</p>
            <p className="mt-0.5 text-small text-ink-secondary">IndustriaLink and real companies never ask for money. If someone does, report the job.</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
