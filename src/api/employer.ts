import type { ApplicationStage, Candidate, Company, EmployerSummary, Job, JobInput, JobStatus } from "@/types";
import { del, get, patch, post } from "./client";

export const employerApi = {
  summary: () => get<EmployerSummary>("/employer/summary"),
  jobs: (status?: JobStatus) => get<Job[]>("/employer/jobs", { status }),
  job: (id: string) => get<Job>(`/employer/jobs/${id}`),
  createJob: (body: JobInput) => post<Job>("/employer/jobs", body),
  updateJob: (id: string, changes: Partial<JobInput>) => patch<Job>(`/employer/jobs/${id}`, changes),
  deleteJob: (id: string) => del(`/employer/jobs/${id}`),
  candidates: (jobId: string) => get<Candidate[]>(`/employer/jobs/${jobId}/candidates`),
  allCandidates: (params: { q?: string; stage?: ApplicationStage | ""; jobId?: string }) => get<Candidate[]>("/employer/candidates", params),
  moveCandidate: (id: string, body: { stage: ApplicationStage; note?: string; notify?: boolean; interview?: { at: string; place: string } }) =>
    patch<Candidate>(`/employer/applications/${id}`, body),
  company: () => get<Company>("/employer/company"),
  updateCompany: (changes: Partial<Company> & { resubmit?: boolean }) => patch<Company>("/employer/company", changes),
};
