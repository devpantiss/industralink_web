import { Link } from "react-router-dom";
import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Search } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { useUser } from "@/app/AuthContext";
import { greeting, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Hero } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";

export default function WorkerHome() {
  const user = useUser();
  const summary = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
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
  const s = summary.data;
  const list = (jobs.data?.items.length ? jobs.data.items : fallback.data?.items ?? []).slice(0, 4);

  return (
    <div className="space-y-6">
      <Hero image="/media/hero-worker.jpg" eyebrow={t("Your job search")} title={<>{greeting()}, {user.name.split(" ")[0]} 👋</>}
        subtitle={s?.nextStep ? t("You have an interview coming up. Good luck!") : t("New verified jobs are added every day.")}
        actions={<LinkButton to="/worker/jobs" variant="accent" size="lg" icon={<Search className="h-5 w-5" />}>{t("Find jobs")}</LinkButton>}>
        <div className="grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
          {[
            { label: t("Applied"), value: s?.activeApplications, to: "/worker/applications" },
            { label: t("Interviews"), value: s?.interviews, to: "/worker/applications?tab=interviews" },
            { label: t("Saved"), value: s?.saved, to: "/worker/saved" },
          ].map((x) => (
            <Link key={x.label} to={x.to} className="rounded-lg bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15">
              <p className="text-h1 tabular">{x.value ?? "–"}</p>
              <p className="text-small leading-tight text-white/75 [overflow-wrap:anywhere]">{x.label}</p>
            </Link>
          ))}
        </div>
      </Hero>

      {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}

      {s?.nextStep && (
        <Card className="animate-rise border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-md"><CalendarClock className="h-6 w-6" aria-hidden /></span>
              <div>
                <p className="text-caption font-semibold uppercase tracking-wide text-interview-fg">{t("Next step")}</p>
                <p className="text-h3 text-ink">{t(s.nextStep.title)} · {s.nextStep.at && formatDateTime(s.nextStep.at)}</p>
                <p className="text-body text-ink-secondary">{s.nextStep.subtitle}</p>
              </div>
            </div>
            <LinkButton to={s.nextStep.link} variant="secondary">{t("View details")}</LinkButton>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2">{jobs.data?.items.length ? t("Jobs for you") : t("New jobs")}</h2>
          <Link to="/worker/jobs" className="inline-flex items-center gap-1 text-body font-medium text-primary hover:underline">{t("See all")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {jobs.isLoading || profile.isLoading ? <ListSkeleton count={2} /> : jobs.isError ? <ErrorState onRetry={() => jobs.refetch()} /> : list.length === 0 ? (
          <EmptyState title={t("No jobs yet")} description={t("New jobs are added every day. Check back soon.")} action={<LinkButton to="/worker/jobs">{t("Browse all jobs")}</LinkButton>} />
        ) : (
          <div className="stagger grid gap-4 lg:grid-cols-2">
            {list.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}
          </div>
        )}
      </section>
    </div>
  );
}
