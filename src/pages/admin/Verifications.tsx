import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, ExternalLink } from "lucide-react";
import type { VerificationItem } from "@/types";
import { adminApi } from "@/api/admin";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { formatDate, timeAgo } from "@/lib/format";
import { Avatar, DefinitionList, PageHeader } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

/**
 * Only companies are reviewed. This protects workers from fake employers.
 * Worker documents are not reviewed: they are simply shared with employers.
 */
export default function Verifications() {
  const q = useQuery({ queryKey: qk.admin.verifications, queryFn: adminApi.verifications });
  const [openId, setOpenId] = useState<string>();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const qc = useQueryClient();
  const toast = useToast();
  const items = [...(q.data ?? [])].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const open = items.find((i) => i.id === openId);

  const decide = useMutation({
    mutationFn: ({ item, decision }: { item: VerificationItem; decision: "approve" | "reject" }) => adminApi.decide(item.kind, item.id, decision, reason.trim() || undefined),
    onSuccess: (_d, { item, decision }) => {
      toast.success(decision === "approve" ? `${item.title} approved. They can publish jobs now.` : `${item.title} rejected`);
      const idx = items.findIndex((i) => i.id === item.id);
      setOpenId(items[idx + 1]?.id);
      setRejecting(false);
      setReason("");
    },
    onError: (e) => { toast.error(errorMessage(e)); if (errorCode(e) === "ALREADY_DONE") setOpenId(undefined); },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.admin.all }),
  });

  return (
    <div>
      <PageHeader title="Company approvals" description="New companies can't publish jobs until you approve them. Oldest first." />
      <QueryState query={q} empty={(d) => d.length === 0 && <EmptyState icon={<BadgeCheck className="h-6 w-6" />} title="All caught up 🎉" description="No companies are waiting for approval." />}>
        {() => (
          <ul className="stagger overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {items.map((i) => (
              <li key={i.id} className="border-b border-border last:border-0">
                <button onClick={() => setOpenId(i.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted">
                  <Avatar name={i.title} square />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">{i.title}</p>
                    <p className="truncate text-small text-ink-muted">{i.subtitle}</p>
                  </div>
                  <span className="hidden text-small text-ink-muted sm:inline">Signed up {timeAgo(i.submittedAt)}</span>
                  <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {open && (
        <Drawer open onClose={() => setOpenId(undefined)} title={open.title} subtitle={`${open.subtitle} · signed up ${formatDate(open.submittedAt)}`} width="max-w-[560px]"
          footer={<>
            <Button variant="secondary" className="text-danger-fg" onClick={() => { setReasonError(undefined); setRejecting(true); }}>Reject</Button>
            <Button onClick={() => decide.mutate({ item: open, decision: "approve" })} loading={decide.isPending && decide.variables?.decision === "approve"}>Approve company</Button>
          </>}>
          <div className="space-y-6">
            <DefinitionList items={Object.entries(open.details)} />
            {open.details["GST number"] && open.details["GST number"] !== "Not given" && (
              <a href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline">
                Check this GST number on the GST portal <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            <div className="rounded-lg bg-surface-muted p-4 text-small text-ink-secondary">
              <p className="font-medium text-ink">Before approving, check:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>The GST number belongs to this company name</li>
                <li>The HR email uses the company's domain (not a random Gmail)</li>
                <li>The company is in an industrial sector we support</li>
              </ul>
            </div>
          </div>
        </Drawer>
      )}

      <Modal open={rejecting} onClose={() => setRejecting(false)} title={`Reject ${open?.title ?? ""}?`}
        footer={<>
          <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
          <Button variant="danger" loading={decide.isPending} onClick={() => {
            if (!reason.trim()) return setReasonError("Please give a reason. The company will see it.");
            if (open) decide.mutate({ item: open, decision: "reject" });
          }}>Reject</Button>
        </>}>
        <Field label="Reason" error={reasonError} hint="Be clear so they can fix it, e.g. 'GST number doesn't match the company name.'">
          {(id, d) => <Textarea id={id} aria-describedby={d} value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!reasonError} autoFocus />}
        </Field>
      </Modal>
    </div>
  );
}
