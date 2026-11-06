/**
 * Data shapes shared by the UI, the mock API and (later) the real backend.
 * The backend should return exactly these shapes; see API_CONTRACT.md.
 */

export type Role = "worker" | "employer" | "admin";
export type AccountStatus = "active" | "pending" | "blocked";
export type VerificationStatus = "pending" | "approved" | "rejected";

export type Sector = "mining" | "metals" | "shipping" | "petroleum" | "logistics" | "automotive";
export type Trade =
  | "welder" | "electrician" | "fitter" | "machine_operator" | "driver"
  | "crane_operator" | "helper" | "security" | "supervisor" | "other";
export type ExperienceBand = "fresher" | "1_2" | "3_5" | "5_plus";
export type Shift = "day" | "night" | "rotational";
export type PayPeriod = "day" | "month";
export type JobType = "full_time" | "contract" | "walk_in";
export type Benefit = "food" | "stay" | "transport" | "pf_esi" | "overtime" | "hazard_pay";
export type JobStatus = "active" | "draft" | "closed";
export type Availability = "immediate" | "15_days" | "30_days";

export type ApplicationStage =
  | "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected" | "withdrawn";

export type DocType =
  | "resume" | "id_proof" | "iti_diploma" | "trade_licence" | "driving_licence"
  | "experience_letter" | "safety_cert";

export interface User {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  status: AccountStatus;
  onboarded: boolean;
  companyId?: string;
  createdAt: string;
}

export interface Location {
  city: string;
  state: string;
}

export interface WorkerProfile {
  userId: string;
  name: string;
  phone: string;
  trade?: Trade;
  experience?: ExperienceBand;
  qualifications: string[]; // e.g. "ITI", "10th"
  licences: string[]; // e.g. "DGMS", "HMV"
  location?: Location;
  willingToRelocate: boolean;
  expectedPay?: number; // ₹ per month
  shiftPreference?: Shift | "any";
  availability: Availability;
  skills: string[];
  about?: string;
  email?: string;
  dob?: string; // ISO date
  gender?: "male" | "female" | "other";
  address?: string;
  pincode?: string;
}

export interface Company {
  id: string;
  name: string;
  sector: Sector;
  size: string;
  location: Location;
  website?: string;
  gstNumber?: string;
  about?: string;
  verification: VerificationStatus;
  rejectionReason?: string;
  status: AccountStatus;
  createdAt: string;
}

export interface WalkIn {
  date: string; // ISO date
  time: string; // "09:00"
  address: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  companyVerified: boolean;
  title: string;
  trade: Trade;
  sector: Sector;
  location: Location;
  payMin?: number;
  payMax?: number;
  payPeriod: PayPeriod;
  shift: Shift;
  jobType: JobType;
  walkIn?: WalkIn;
  openings: number;
  experience: ExperienceBand;
  qualifications: string[];
  benefits: Benefit[];
  responsibilities: string[];
  requirements: string[];
  status: JobStatus;
  postedAt: string;
  deadline?: string;
  siteName?: string; // plant / site, e.g. "Smelter Plant 2"
  /** HR number. Only sent to workers once they are shortlisted AND allowCalls is on. */
  hrPhone?: string;
  allowCalls: boolean;
  callHours?: string; // e.g. "10 AM – 6 PM"
  removedByAdmin?: boolean;
  applicantsCount: number;
  newApplicantsCount: number;
}

/** Extra fields the API adds for the logged-in worker. */
export interface JobForWorker extends Job {
  saved: boolean;
  appliedApplicationId?: string;
}

export interface TimelineEvent {
  stage: ApplicationStage | "viewed";
  at: string;
  note?: string;
}

export interface Interview {
  at: string; // ISO datetime
  place: string;
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  stage: ApplicationStage;
  appliedAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  interview?: Interview;
  sentWith: "profile" | "document";
  documentId?: string;
  rejectionNote?: string;
}

/** Application as seen by the worker (job embedded). */
export interface WorkerApplication extends Application {
  job: Job;
  /** Present only when the worker is shortlisted (or later) and the employer allows calls. */
  contact?: { phone: string; hours?: string };
}

/** Application as seen by the employer (candidate embedded). */
export interface Candidate extends Application {
  worker: WorkerProfile;
  jobTitle: string;
  /** All of the worker's documents (resume, ID, certificates) so HR can review them. */
  documents: WorkerDocument[];
}

export interface WorkerDocument {
  id: string;
  ownerId: string;
  name: string;
  type: DocType;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  url?: string;
  isDefaultResume?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export type VerificationKind = "company";

export interface VerificationItem {
  id: string; // id of the company / worker / document
  kind: VerificationKind;
  title: string;
  subtitle: string;
  submittedAt: string;
  status: VerificationStatus;
  details: Record<string, string>;
  documents: Pick<WorkerDocument, "id" | "name" | "type" | "url" | "mimeType">[];
}

export interface AdminUserRow {
  id: string;
  role: "worker" | "employer";
  name: string;
  contact: string;
  city: string;
  status: AccountStatus;
  /** Only companies are verified. */
  verification?: VerificationStatus;
  joinedAt: string;
}

export interface CompanyForWorker {
  company: Company;
  jobs: JobForWorker[];
}

export interface AdminJobRow extends Job {
  companyStatus: AccountStatus;
}

/* ---------- Summaries for Home pages ---------- */

export interface WorkerSummary {
  activeApplications: number;
  interviews: number;
  saved: number;
  profileStrength: number; // 0-100
  profileHint?: string;
  /** Items still missing from the profile; drives the "complete your profile" banner. */
  missing: { key: string; label: string; link: string }[];
  nextStep?: { title: string; subtitle: string; link: string; at?: string };
}

export interface EmployerSummary {
  openJobs: number;
  newApplicants: number;
  interviewsThisWeek: number;
  hiredThisMonth: number;
  attention: { id: string; text: string; link: string; action: string }[];
  applicantsPerDay: { day: string; count: number }[];
  funnel: { stage: string; count: number }[];
}

export interface AdminSummary {
  workers: number;
  companies: number;
  activeJobs: number;
  pendingVerifications: number;
  attention: { id: string; text: string; link: string }[];
  signupsPerWeek: { week: string; workers: number; companies: number }[];
}

/* ---------- Requests ---------- */

export interface JobSearchParams {
  q?: string;
  city?: string;
  trade?: Trade | "";
  sector?: Sector | "";
  shift?: Shift | "";
  minPay?: number;
  foodStay?: boolean;
  walkInOnly?: boolean;
  verifiedOnly?: boolean;
  sort?: "newest" | "pay" | "nearest";
  page?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type JobInput = Omit<
  Job,
  "id" | "companyId" | "companyName" | "companyVerified" | "postedAt" | "applicantsCount" | "newApplicantsCount"
>;
