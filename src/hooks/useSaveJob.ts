import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobForWorker } from "@/types";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

/** Save / unsave a job, with an Undo in the toast. */
export function useSaveJob() {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: ({ job, save }: { job: JobForWorker; save: boolean }) => (save ? workerApi.saveJob(job.id) : workerApi.unsaveJob(job.id)),
    onSuccess: (_d, { job, save }) => {
      qc.invalidateQueries({ queryKey: qk.worker.all });
      if (save) toast.success("Job saved");
      else toast.success("Removed from Saved", { label: "Undo", onClick: () => m.mutate({ job, save: true }) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return {
    toggle: (job: JobForWorker) => m.mutate({ job, save: !job.saved }),
    pendingId: m.isPending ? m.variables?.job.id : undefined,
  };
}
 