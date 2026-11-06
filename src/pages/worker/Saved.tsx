import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { PageHeader } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, QueryState } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";

export default function Saved() {
  const q = useQuery({ queryKey: qk.worker.saved, queryFn: workerApi.saved });
  const { toggle, pendingId } = useSaveJob();
  return (
    <div>
      <PageHeader title="Saved jobs" description="Jobs you want to look at again." />
      <QueryState query={q}
        empty={(d) => d.length === 0 && (
          <EmptyState icon={<Heart className="h-6 w-6" />} title="No saved jobs yet" description="Tap ♡ on any job to save it here." action={<LinkButton to="/worker/jobs">Find jobs</LinkButton>} />
        )}>
        {(jobs) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...jobs].sort((a, b) => Number(a.status !== "active") - Number(b.status !== "active")).map((j) => (
              <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
