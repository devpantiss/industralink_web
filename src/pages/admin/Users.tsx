import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users as UsersIcon } from "lucide-react";
import type { AccountStatus, AdminUserRow } from "@/types";
import { adminApi } from "@/api/admin";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { formatDate } from "@/lib/format";
import { Avatar, PageHeader, Tabs } from "@/components/ui/Misc";
import { AccountStatusBadge, VerificationBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

export default function Users() {
  const [sp, setSp] = useSearchParams();
  const role = (sp.get("role") as "worker" | "employer") || "worker";
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const params = { role, q: q.trim() || undefined, status };
  const list = useQuery({ queryKey: qk.admin.users(params), queryFn: () => adminApi.users(params) });
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const impact = useQuery({ queryKey: ["admin", "impact", target?.id], queryFn: () => adminApi.userImpact(target!.id), enabled: !!target && target.role === "employer" && target.status !== "blocked" });
  const qc = useQueryClient();
  const toast = useToast();
  const blocking = target?.status !== "blocked";

  const change = useMutation({
    mutationFn: (u: AdminUserRow) => adminApi.setUserStatus(u.id, u.status === "blocked" ? "active" : "blocked"),
    onSuccess: (_d, u) => { toast.success(u.status === "blocked" ? `${u.name} unblocked` : `${u.name} blocked`); setTarget(null); qc.invalidateQueries({ queryKey: qk.admin.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Users" description="All workers and companies on the platform." />
      <Tabs tabs={[{ value: "worker", label: "Workers" }, { value: "employer", label: "Companies" }]} value={role} onChange={(v) => setSp({ role: v }, { replace: true })} className="mb-4" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email, city" className="pl-9" />
        </label>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus | "")} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </Select>
      </div>

      <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState icon={<UsersIcon className="h-6 w-6" />} title="No users found" description="Try a different search or filter." />}>
        {(rows) => (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-surface-muted text-small text-ink-secondary">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">City</th>
                  {role === "employer" && <th className="px-5 py-3 font-medium">Verification</th>}
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => (
                  <tr key={u.id} className="h-[52px] hover:bg-surface-muted/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" square={u.role === "employer"} />
                        <div className="min-w-0"><p className="truncate font-medium text-ink">{u.name}</p><p className="truncate text-small text-ink-muted">{u.contact}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-small text-ink-secondary">{u.city}</td>
                    {role === "employer" && <td className="px-5 py-3">{u.verification && <VerificationBadge status={u.verification} compact />}</td>}
                    <td className="px-5 py-3"><AccountStatusBadge status={u.status} /></td>
                    <td className="px-5 py-3 text-small text-ink-secondary">{formatDate(u.joinedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant={u.status === "blocked" ? "secondary" : "ghost"} size="sm" className={u.status !== "blocked" ? "text-danger-fg hover:bg-danger-bg hover:text-danger-fg" : ""} onClick={() => setTarget(u)}>
                        {u.status === "blocked" ? "Unblock" : "Block"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((u) => (
                <li key={u.id} className="flex items-center gap-3 p-4">
                  <Avatar name={u.name} size="sm" square={u.role === "employer"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="truncate text-small text-ink-muted">{u.contact} · {u.city}</p>
                    <div className="mt-1 flex gap-1.5"><AccountStatusBadge status={u.status} />{u.verification && <VerificationBadge status={u.verification} compact />}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTarget(u)}>{u.status === "blocked" ? "Unblock" : "Block"}</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryState>

      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} onConfirm={() => target && change.mutate(target)} loading={change.isPending}
        tone={blocking ? "danger" : "primary"} title={blocking ? `Block ${target?.name}?` : `Unblock ${target?.name}?`} confirmLabel={blocking ? "Block" : "Unblock"}
        message={blocking
          ? target?.role === "employer"
            ? impact.data ? `${impact.data.activeJobs} active jobs will be hidden and ${impact.data.applicants} applicants affected. They can't log in until unblocked.` : "Their jobs will be hidden and they can't log in."
            : "They won't be able to log in or apply for jobs."
          : "They will be able to log in again."} />
    </div>
  );
}
