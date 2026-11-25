import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportReason } from "@/types";
import { reportsApi, supportAdminApi, type AdminReportRow } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { timeAgo } from "@/lib/format";
import { PageHeader, Tabs } from "@/components/ui/Misc";
import { Badge, JobStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  asks_money: "Asked for money", fake: "Looks fake", wrong_details: "Wrong pay / details", unsafe: "Unsafe work", other: "Other",
};

/** Job reports from workers, and help requests from anyone. */
export default function Reports() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as "jobs" | "help") ?? "jobs";
  const [status, setStatus] = useState("open");
  return (
    <div>
      <PageHeader title="Reports & help" description="Act on reported jobs first: a job asking for money can hurt workers today." />
      <Tabs tabs={[{ value: "jobs", label: "Reported jobs" }, { value: "help", label: "Help requests" }]} value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} className="mb-4" />
      <div className="mb-4 flex justify-end">
        <Select aria-label="Show" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="open">Open</option>
          <option value={tab === "jobs" ? "dismissed" : "closed"}>{tab === "jobs" ? "Dismissed" : "Closed"}</option>
          {tab === "jobs" && <option value="job_removed">Job removed</option>}
          <option value="all">All</option>
        </Select>
      </div>
      <div key={tab} className="animate-page">{tab === "jobs" ? <JobReports status={status} /> : <HelpRequests status={status} />}</div>
    </div>
  );
}

function JobReports({ status }: { status: string }) {
  const list = useQuery({ queryKey: qk.admin.reports(status), queryFn: () => reportsApi.list(status as never) });
  const [target, setTarget] = useState<AdminReportRow | null>(null);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const resolve = useMutation({
    mutationFn: ({ r, action }: { r: AdminReportRow; action: "dismiss" | "remove_job" }) => reportsApi.resolve(r.id, action, note.trim() || undefined),
    onSuccess: (_d, { action }) => { toast.success(action === "remove_job" ? "Job removed. The company was told why." : "Report dismissed"); setTarget(null); setNote(""); qc.invalidateQueries({ queryKey: qk.admin.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
    <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState art="done" title={status === "open" ? "No open reports" : "Nothing here"} description="Workers report jobs from the job page." />}>
      {(rows) => (
        <ul className="stagger space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-surface p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.reason === "asks_money" || r.reason === "unsafe" ? "danger" : "warning"}>{REPORT_REASON_LABEL[r.reason]}</Badge>
                    {r.reportsForJob > 1 && <Badge tone="danger">{r.reportsForJob} reports on this job</Badge>}
                    <span className="text-caption text-ink-muted">{timeAgo(r.at)} · by {r.reporterName}</span>
                  </div>
                  <p className="mt-2 text-body font-medium text-ink">{r.jobTitle} <span className="font-normal text-ink-secondary">· {r.companyName}</span></p>
                  {r.details && <p className="mt-1 rounded-md bg-surface-muted px-3 py-2 text-body text-ink-secondary">"{r.details}"</p>}
                  {r.status !== "open" && <p className="mt-2 text-small text-ink-muted">{r.status === "dismissed" ? "Dismissed" : "Job removed"} by {r.resolvedBy} · {r.resolvedAt && timeAgo(r.resolvedAt)}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <JobStatusBadge status={r.jobStatus} />
                  <Link to={`/jobs/${r.jobId}`} target="_blank" className="text-small font-medium text-primary hover:underline">View job</Link>
                  {r.status === "open" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => resolve.mutate({ r, action: "dismiss" })} disabled={resolve.isPending}>Dismiss</Button>
                      {r.jobStatus === "active" && <Button size="sm" variant="danger" onClick={() => setTarget(r)}>Remove job</Button>}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
    <Modal open={!!target} onClose={() => setTarget(null)} title={`Remove "${target?.jobTitle ?? ""}"?`}
            footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant="danger" loading={resolve.isPending} onClick={() => target && resolve.mutate({ r: target, action: "remove_job" })}>Remove job</Button></>}>
            <p>The job closes straight away, all open reports on it are marked done, and {target?.companyName} is told the reason.</p>
            <Field label="Reason shown to the company (optional)" className="mt-4">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder={target ? REPORT_REASON_LABEL[target.reason] : ""} />}</Field>
          </Modal>
    </>
  );
}

function HelpRequests({ status }: { status: string }) {
  const list = useQuery({ queryKey: qk.admin.support(status), queryFn: () => supportAdminApi.list(status as never) });
  const qc = useQueryClient();
  const toast = useToast();
  const close = useMutation({
    mutationFn: (id: string) => supportAdminApi.close(id),
    onSuccess: () => { toast.success("Marked as done. The person was told."); qc.invalidateQueries({ queryKey: qk.admin.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState art="done" title="No help requests" description="People send these from the Help page." />}>
      {(rows) => (
        <ul className="stagger space-y-3">
          {rows.map((t) => (
            <li key={t.id} className="rounded-lg border border-border bg-surface p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={t.topic.includes("money") ? "danger" : "neutral"}>{t.topic}</Badge>
                    <span className="text-caption text-ink-muted">{timeAgo(t.at)} · {t.role === "guest" ? "Not logged in" : t.role === "employer" ? "Employer" : "Worker"}</span>
                  </div>
                  <p className="mt-2 text-body font-medium text-ink">{t.name} <span className="select-all font-normal text-ink-secondary">· {t.contact}</span></p>
                  <p className="mt-1 whitespace-pre-line text-body text-ink-secondary">{t.message}</p>
                </div>
                {t.status === "open" ? <Button size="sm" variant="secondary" loading={close.isPending && close.variables === t.id} onClick={() => close.mutate(t.id)}>Mark done</Button> : <Badge tone="success">Done</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

