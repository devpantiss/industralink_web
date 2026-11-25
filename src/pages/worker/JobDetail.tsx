import { useState } from "react";
import { t } from "@/lib/i18n";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode } from "@/api/client";
import { LinkButton } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Misc";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { ApplyDrawer, ReportDialog } from "@/components/domain/JobActions";
import { isJobClosed, JobDetailPanel } from "@/components/domain/JobDetailPanel";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";

export default function JobDetail() {
  const { id = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = useQuery({ queryKey: qk.worker.job(id), queryFn: () => workerApi.job(id), retry: (n, e) => errorCode(e) !== "NOT_FOUND" && n < 2 });
  const similar = useQuery({
    queryKey: qk.worker.jobs({ similar: q.data?.trade }),
    queryFn: () => workerApi.searchJobs({ trade: q.data!.trade, sort: "newest" }),
    enabled: !!q.data,
  });
  const { toggle, pendingId } = useSaveJob();
  const [reportOpen, setReportOpen] = useState(false);
  const applyOpen = sp.get("apply") === "1";
  const setApply = (open: boolean) => { const n = new URLSearchParams(sp); open ? n.set("apply", "1") : n.delete("apply"); setSp(n, { replace: true }); };

  if (q.isLoading) return <ListSkeleton count={2} lines={5} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND")
    return <EmptyState art="notFound" title={t("Job not found")} description={t("This job was removed or the link is wrong.")} action={<LinkButton to="/worker/jobs">{t("Find other jobs")}</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;

  const job = q.data;
  const closed = isJobClosed(job);
  const more = (similar.data?.items ?? []).filter((j) => j.id !== job.id).slice(0, 3);

  return (
    <div>
      <Link to="/worker/jobs" className="mb-4 inline-flex items-center gap-1.5 text-small font-semibold text-ink-secondary hover:text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t("Back to jobs")}</Link>
      {closed && <div className="mb-4"><Banner tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>{t("This job is no longer accepting applications.")}</Banner></div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl bg-surface-muted p-5 sm:p-7">
          <JobDetailPanel job={job} onToggleSave={toggle} saving={pendingId === job.id} onApply={() => setApply(true)} onReport={() => setReportOpen(true)} />
        </section>
        {more.length > 0 && (
          <aside className="space-y-3 lg:sticky lg:top-24">
            <h2 className="text-h2 font-bold">{t("Similar jobs")}</h2>
            {more.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}
          </aside>
        )}
      </div>

      <ApplyDrawer open={applyOpen && !closed && !job.appliedApplicationId} onClose={() => setApply(false)} jobId={job.id} title={`${job.title} – ${job.companyName}`} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} jobId={job.id} />
    </div>
  );
}
