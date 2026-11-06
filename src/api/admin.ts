import type { AccountStatus, AdminJobRow, AdminSummary, AdminUserRow, AuditEntry, VerificationItem, VerificationKind } from "@/types";
import { get, patch, post } from "./client";

export const adminApi = {
  summary: () => get<AdminSummary>("/admin/summary"),
  verifications: () => get<VerificationItem[]>("/admin/verifications"),
  decide: (kind: VerificationKind, id: string, decision: "approve" | "reject", reason?: string) =>
    post(`/admin/verifications/${kind}/${id}`, { decision, reason }),
  users: (params: { role: "worker" | "employer"; q?: string; status?: AccountStatus | "" }) => get<AdminUserRow[]>("/admin/users", params),
  setUserStatus: (id: string, status: AccountStatus) => patch(`/admin/users/${id}`, { status }),
  userImpact: (id: string) => get<{ activeJobs: number; applicants: number }>(`/admin/user-impact/${id}`),
  audit: () => get<AuditEntry[]>("/admin/audit"),
  jobs: (params: { q?: string; status?: string }) => get<AdminJobRow[]>("/admin/jobs", params),
  removeJob: (id: string, reason: string) => post(`/admin/jobs/${id}/remove`, { reason }),
};
