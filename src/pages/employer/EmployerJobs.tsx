import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MoreVertical, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import type { Job, JobStatus } from "@/types";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { formatDate, formatPay } from "@/lib/format";
import { PageHeader, Tabs } from "@/components/ui/Misc";
import { JobStatusBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { VerificationBanner } from "@/components/domain/VerificationBanner";

export default function EmployerJobs() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as JobStatus) || "active";
  const q = useQuery({ queryKey: qk.employer.jobs(), queryFn: () => employerApi.jobs() });
  const all = q.data ?? [];
  const count = (s: JobStatus) => all.filter((j) => j.status === s).length;
  const [closing, setClosing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [notifyRest, setNotifyRest] = useState(true);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.employer.all });

  const close = useMutation({
    mutationFn: (j: Job) => employerApi.updateJob(j.id, { status: "closed" }),
    onSuccess: () => { setClosing(null); refresh(); toast.success(notifyRest ? "Job closed. Remaining applicants will be told." : "Job closed"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (j: Job) => employerApi.deleteJob(j.id),
    onSuccess: () => { setDeleting(null); refresh(); toast.success("Draft deleted"); },
    onError: (e, j) => {
      setDeleting(null);
      if (errorCode(e) === "HAS_APPLICANTS") { toast.error(errorMessage(e)); setClosing(j); } else toast.error(errorMessage(e));
    },
  });

  return (
    <div>
      <PageHeader title="Jobs" description="Create, edit and close your job posts."
        actions={<LinkButton to="/employer/jobs/new" icon={<Plus className="h-4 w-4" />}>Post a job</LinkButton>} />
      <div className="mb-4"><VerificationBanner /></div>
      <Tabs tabs={[{ value: "active", label: "Active", count: count("active") }, { value: "draft", label: "Drafts", count: count("draft") }, { value: "closed", label: "Closed", count: count("closed") }]}
        value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} className="mb-4" />

      <QueryState query={q}
        empty={(d) => d.filter((j) => j.status === tab).length === 0 && (
          <EmptyState art="jobs" title={tab === "active" ? "No active jobs" : tab === "draft" ? "No drafts" : "No closed jobs"}
            description={tab === "active" ? "Post a job and start getting applicants today." : undefined}
            action={tab !== "closed" ? <LinkButton to="/employer/jobs/new">Post a job</LinkButton> : undefined} />
        )}>
        {(d) => (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-surface-muted text-small text-ink-secondary">
                <tr>
                  <th className="px-5 py-3 font-medium">Job</th>
                  <th className="px-5 py-3 font-medium">Pay</th>
                  <th className="px-5 py-3 font-medium">Applicants</th>
                  <th className="px-5 py-3 font-medium">Posted</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.filter((j) => j.status === tab).map((j) => (
                  <tr key={j.id} className="h-[52px] hover:bg-surface-muted/60">
                    <td className="px-5 py-3">
                      <Link to={j.status === "draft" ? `/employer/jobs/${j.id}/edit` : `/employer/jobs/${j.id}`} className="font-medium text-ink hover:text-primary">{j.title}</Link>
                      <p className="text-small text-ink-muted">{j.location.city} · {j.openings} openings</p>
                    </td>
                    <td className="px-5 py-3 text-small text-ink-secondary">{formatPay(j.payMin, j.payMax, j.payPeriod)}</td>
                    <td className="px-5 py-3 tabular">
                      {j.applicantsCount}
                      {j.newApplicantsCount > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-white">{j.newApplicantsCount} new</span>}
                    </td>
                    <td className="px-5 py-3 text-small text-ink-secondary">{formatDate(j.postedAt)}</td>
                    <td className="px-5 py-3"><JobStatusBadge status={j.status} /></td>
                    <td className="px-3 py-3"><RowMenu job={j} onClose={() => setClosing(j)} onDelete={() => setDeleting(j)} onDuplicate={() => navigate(`/employer/jobs/new?from=${j.id}`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile: cards */}
            <ul className="divide-y divide-border md:hidden">
              {d.filter((j) => j.status === tab).map((j) => (
                <li key={j.id} className="flex items-start gap-3 p-4">
                  <Link to={j.status === "draft" ? `/employer/jobs/${j.id}/edit` : `/employer/jobs/${j.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{j.title}</p>
                    <p className="text-small text-ink-muted">{j.location.city} · {j.applicantsCount} applicants{j.newApplicantsCount ? ` · ${j.newApplicantsCount} new` : ""}</p>
                    <div className="mt-1"><JobStatusBadge status={j.status} /></div>
                  </Link>
                  <RowMenu job={j} onClose={() => setClosing(j)} onDelete={() => setDeleting(j)} onDuplicate={() => navigate(`/employer/jobs/new?from=${j.id}`)} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryState>

      <ConfirmDialog open={!!closing} onClose={() => setClosing(null)} onConfirm={() => closing && close.mutate(closing)} loading={close.isPending}
        title="Close this job?" confirmLabel="Close job" message={`"${closing?.title}" will stop taking applications.`}>
        <Checkbox label="Tell remaining applicants the job is closed" checked={notifyRest} onChange={setNotifyRest} />
      </ConfirmDialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting)} loading={remove.isPending}
        title="Delete this job?" confirmLabel="Delete" message="This can't be undone." />
    </div>
  );
}

function RowMenu({ job, onClose, onDelete, onDuplicate }: { job: Job; onClose: () => void; onDelete: () => void; onDuplicate: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-body hover:bg-surface-muted";
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Button variant="ghost" size="sm" aria-label={`Actions for ${job.title}`} aria-expanded={open} onClick={() => setOpen(!open)} className="w-8 px-0"><MoreVertical className="h-4 w-4" /></Button>
      {open && (
        <div className="glass-menu animate-pop absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-white/60 py-1">
          <button className={item} onClick={() => navigate(`/employer/jobs/${job.id}/edit`)}><Pencil className="h-4 w-4" aria-hidden /> Edit</button>
          <button className={item} onClick={onDuplicate}><Copy className="h-4 w-4" aria-hidden /> Duplicate</button>
          {job.status === "active" && <button className={item} onClick={() => { setOpen(false); onClose(); }}><XCircle className="h-4 w-4" aria-hidden /> Close job</button>}
          {job.status !== "active" && <button className={`${item} text-danger-fg`} onClick={() => { setOpen(false); onDelete(); }}><Trash2 className="h-4 w-4" aria-hidden /> Delete</button>}
        </div>
      )}
    </div>
  );
}
