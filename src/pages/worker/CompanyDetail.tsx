import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Globe, MapPin, Users } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode } from "@/api/client";
import { SECTOR_LABEL } from "@/lib/labels";
import { VerifiedTick } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { SECTOR_ICON, SECTOR_TINT } from "@/components/domain/JobBits";
import { useSaveJob } from "@/hooks/useSaveJob";
import { cn } from "@/lib/cn";

export default function CompanyDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: qk.worker.company(id), queryFn: () => workerApi.company(id) });
  const { toggle, pendingId } = useSaveJob();
  if (q.isLoading) return <ListSkeleton count={2} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND") return <EmptyState title="Company not found" action={<LinkButton to="/worker/jobs">Find jobs</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const { company: c, jobs } = q.data;
  const Icon = SECTOR_ICON[c.sector];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="h-20 bg-primary-soft sm:h-24" aria-hidden />
        <div className="px-5 pb-5 sm:px-6">
          <span className={cn("-mt-9 flex h-16 w-16 items-center justify-center rounded-xl border-4 border-surface shadow-md", SECTOR_TINT[c.sector])}><Icon className="h-8 w-8" aria-hidden /></span>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-h1">{c.name}</h1>
            <VerifiedTick verified={c.verification === "approved"} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-secondary">
            <li className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" aria-hidden /> {SECTOR_LABEL[c.sector]}</li>
            <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {c.location.city}{c.location.state ? `, ${c.location.state}` : ""}</li>
            <li className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> {c.size} people</li>
            {c.website && <li className="flex items-center gap-1.5"><Globe className="h-4 w-4" aria-hidden /> {c.website}</li>}
          </ul>
          {c.about && <p className="mt-4 max-w-3xl text-body text-ink">{c.about}</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-h2">Open jobs <span className="text-ink-muted">({jobs.length})</span></h2>
        {jobs.length === 0 ? <EmptyState title="No open jobs right now" description="Save a job you like elsewhere, and check back later." /> : (
          <div className="stagger grid gap-4 lg:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}</div>
        )}
      </section>
    </div>
  );
}
