import type {
  Application, CompanyForWorker, JobForWorker, JobSearchParams, Paginated, WorkerApplication, WorkerDocument, WorkerProfile, WorkerSummary, DocType,
} from "@/types";
import { del, get, http, patch, post } from "./client";

export const workerApi = {
  summary: () => get<WorkerSummary>("/worker/summary"),
  searchJobs: (params: JobSearchParams) => get<Paginated<JobForWorker>>("/jobs", params),
  job: (id: string) => get<JobForWorker>(`/jobs/${id}`),
  company: (id: string) => get<CompanyForWorker>(`/companies/${id}`),
  saveJob: (id: string) => post(`/jobs/${id}/save`),
  unsaveJob: (id: string) => del(`/jobs/${id}/save`),
  saved: () => get<JobForWorker[]>("/worker/saved"),
  apply: (jobId: string, body: { sentWith: "profile" | "document"; documentId?: string }) =>
    post<Application>(`/jobs/${jobId}/apply`, body),
  applications: () => get<WorkerApplication[]>("/worker/applications"),
  application: (id: string) => get<WorkerApplication>(`/worker/applications/${id}`),
  withdraw: (id: string) => post<Application>(`/worker/applications/${id}/withdraw`),
  profile: () => get<WorkerProfile>("/worker/profile"),
  updateProfile: (changes: Partial<WorkerProfile>) => patch<WorkerProfile>("/worker/profile", changes),
  documents: () => get<WorkerDocument[]>("/worker/documents"),
  uploadDocument: (file: File, type: DocType, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return http
      .post<WorkerDocument>("/worker/documents", form, {
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },
  deleteDocument: (id: string) => del(`/worker/documents/${id}`),
  setDefaultResume: (id: string) => post(`/worker/documents/${id}/default`),
};
