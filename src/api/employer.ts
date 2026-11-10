import type { ApplicationStage, Candidate, Company, CompanyDocType, CompanyDocument, EmployerSummary, Interview, Job, JobInput, JobStatus, Offer } from "@/types";
import { del, get, http, patch, post } from "./client";

export type InterviewInput = Pick<Interview, "at" | "place" | "contactPerson" | "bring">;
export type OfferInput = Omit<Offer, "sentAt">;

export const employerApi = {
  summary: () => get<EmployerSummary>("/employer/summary"),
  jobs: (status?: JobStatus) => get<Job[]>("/employer/jobs", { status }),
  job: (id: string) => get<Job>(`/employer/jobs/${id}`),
  createJob: (body: JobInput) => post<Job>("/employer/jobs", body),
  updateJob: (id: string, changes: Partial<JobInput>) => patch<Job>(`/employer/jobs/${id}`, changes),
  deleteJob: (id: string) => del(`/employer/jobs/${id}`),
  candidates: (jobId: string) => get<Candidate[]>(`/employer/jobs/${jobId}/candidates`),
  allCandidates: (params: { q?: string; stage?: ApplicationStage | ""; jobId?: string }) => get<Candidate[]>("/employer/candidates", params),
  moveCandidate: (id: string, body: { stage: ApplicationStage; note?: string; notify?: boolean; interview?: InterviewInput; offer?: OfferInput }) =>
    patch<Candidate>(`/employer/applications/${id}`, body),
  /** Marks the candidate as seen ("Seen by employer" on the worker's side). */
  viewCandidate: (id: string) => post(`/employer/applications/${id}/view`),
  company: () => get<Company>("/employer/company"),
  updateCompany: (changes: Partial<Company> & { resubmit?: boolean }) => patch<Company>("/employer/company", changes),
  companyDocuments: () => get<CompanyDocument[]>("/employer/company/documents"),
  uploadCompanyDocument: (file: File, type: CompanyDocType, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return http
      .post<CompanyDocument>("/employer/company/documents", form, {
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },
  deleteCompanyDocument: (id: string) => del(`/employer/company/documents/${id}`),
};
