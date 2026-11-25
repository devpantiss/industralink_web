import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { AdminJobRow } from "@/types";
import { adminApi } from "@/api/admin";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { formatDate, formatPay } from "@/lib/format";
import { PageHeader } from "@/components/ui/Misc";
import { Badge, JobStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { CompanyLogo } from "@/components/domain/JobBits";

const REASONS = ["Asks workers for money", "Fake or misleading job", "Pay not shown / unrealistic", "Duplicate post", "Other"];

/** Keep the platform clean: find and remove bad jobs. */
export default function AdminJobs() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const params = { q: q.trim() || undefined, status: status || undefined };
  const list = useQuery({ queryKey: qk.admin.jobs(params), queryFn: () => adminApi.jobs(params) });
  const [target, setTarget] = useState<AdminJobRow | null>(null);
  const [reason, setReason] = useState(REASONS[0]!);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => adminApi.removeJob(target!.id, reason === "Other" ? note.trim() : `${reason}${note.trim() ? ` – ${note.trim()}` : ""}`),
    onSuccess: () => { toast.success("Job removed. The company was told why."); setTarget(null); setNote(""); qc.invalidateQueries({ queryKey: qk.admin.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Jobs" description="All published jobs. Remove anything fake, unsafe or asking workers for money." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search jobs</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, company, city" className="pl-9" />
        </label>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="">All</option>
        </Select>
      </div>
      <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState art="jobs" title="No jobs found" />}>
        {(rows) => (
          <ul className="stagger overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {rows.map((j) => (
              <li key={j.id} className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-0 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CompanyLogo job={j} />
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-ink">{j.title}</p>
                    <p className="truncate text-small text-ink-muted">{j.companyName} · {j.location.city} · posted {formatDate(j.postedAt)}</p>
                  </div>
                </div>
                <span className={!j.payMin && !j.payMax ? "text-small font-medium text-warning-fg" : "text-small text-ink-secondary"}>{formatPay(j.payMin, j.payMax, j.payPeriod)}</span>
                <div className="flex items-center gap-2">
                  {j.removedByAdmin ? <Badge tone="danger">Removed</Badge> : <JobStatusBadge status={j.status} />}
                  {!j.companyVerified && <Badge tone="warning">Unverified company</Badge>}
                  {j.status === "active" && <Button variant="ghost" size="sm" className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg" onClick={() => setTarget(j)}>Remove</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Remove "${target?.title ?? ""}"?`}
        footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant="danger" loading={remove.isPending} disabled={reason === "Other" && !note.trim()} onClick={() => remove.mutate()}>Remove job</Button></>}>
        <p>The job is closed straight away and {target?.companyName} is told the reason.</p>
        <div className="mt-4 space-y-3">
          <Field label="Reason">{(id) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</Select>}</Field>
          <Field label={reason === "Other" ? "Details (required)" : "Details (optional)"}>{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        </div>
      </Modal>
    </div>
  );
}
