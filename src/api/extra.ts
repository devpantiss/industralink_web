/** Endpoints added after the gap review. See API_CONTRACT.md, section "Added". */
import type {
  JobForWorker, JobSearchParams, Paginated,
  Company, EmployerAnalytics, ExperienceBand, Job, JobReport, Message, MessagePage, MessageThread, PlatformSettings, ReportReason, ReportStatus, Sector,
  SupportTicket, TalentProfile, Trade, User, UserSettings, WorkerApplication,
} from "@/types";
import { get, patch, post, put } from "./client";

export type AdminReportRow = JobReport & { jobStatus: Job["status"]; reportsForJob: number };

export const reportsApi = {
  report: (jobId: string, body: { reason: ReportReason; details?: string }) => post(`/jobs/${jobId}/report`, body),
  list: (status: ReportStatus | "all" = "open") => get<AdminReportRow[]>("/admin/reports", { status }),
  resolve: (id: string, action: "dismiss" | "remove_job", note?: string) => post(`/admin/reports/${id}`, { action, note }),
};

export const repliesApi = {
  interview: (appId: string, response: "attending" | "cant_attend", note?: string) =>
    post<WorkerApplication>(`/worker/applications/${appId}/interview-response`, { response, note }),
  offer: (appId: string, response: "accepted" | "declined", note?: string) =>
    post<WorkerApplication>(`/worker/applications/${appId}/offer-response`, { response, note }),
};

export const passwordApi = {
  forgot: (email: string) => post<{ ok: boolean }>("/auth/password/forgot", { email }),
  reset: (token: string, password: string) => post<{ ok: boolean; role: string }>("/auth/password/reset", { token, password }),
  /** `current` is left out when the account has no password yet (made with Google). */
  change: (current: string | undefined, next: string) => post("/auth/password/change", { current, next }),
};

export const publicApi = {
  job: (id: string) => get<Job>(`/public/jobs/${id}`),
  /** Job search without logging in. Same filters as the worker search. */
  searchJobs: (params: JobSearchParams) => get<Paginated<JobForWorker>>("/public/jobs", params),
  support: (body: { topic: string; message: string; name?: string; contact?: string }) => post("/support", body),
};

export const accountApi = {
  settings: () => get<UserSettings>("/me/settings"),
  updateSettings: (changes: Partial<UserSettings>) => patch<UserSettings>("/me/settings", changes),
  deleteAccount: () => post("/me/delete", { confirm: "DELETE" }),
  /** Worker's mobile number (10 digits), for companies to call. 409 PHONE_TAKEN if another account has it. */
  savePhone: (phone: string) => put<User>("/me/phone", { phone }),
};

export const companiesApi = {
  list: (params: { q?: string; sector?: Sector | "" }) => get<{ company: Company; openJobs: number }[]>("/companies", params),
};

export const supportAdminApi = {
  list: (status: "open" | "closed" | "all" = "open") => get<SupportTicket[]>("/admin/support", { status }),
  close: (id: string) => post(`/admin/support/${id}/close`),
};

export const messagesApi = {
  threads: () => get<MessageThread[]>("/messages"),
  /** The newest 50 messages (and marks the chat read), or with `before` the 50 before that message. */
  thread: (applicationId: string, before?: string) =>
    get<MessagePage>(`/messages/${applicationId}`, before ? { before } : undefined),
  /** clientId: made once per message, so a retry after a network error is saved only once. */
  send: (applicationId: string, text: string, clientId?: string) => post<Message>(`/messages/${applicationId}`, { text, clientId }),
};

export const talentApi = {
  search: (params: { q?: string; trade?: Trade | ""; city?: string; experience?: ExperienceBand | ""; relocate?: boolean }) =>
    get<TalentProfile[]>("/employer/talent", params),
  invite: (workerId: string, jobId: string) => post(`/employer/talent/${workerId}/invite`, { jobId }),
  analytics: () => get<EmployerAnalytics>("/employer/analytics"),
};

export const platformApi = {
  get: () => get<PlatformSettings>("/admin/settings"),
  update: (changes: Partial<PlatformSettings>) => patch<PlatformSettings>("/admin/settings", changes),
};
