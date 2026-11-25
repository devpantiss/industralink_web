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
export type PayType = "in_hand" | "ctc";
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
  /** Languages the worker can speak, e.g. ["Hindi", "Odia"]. */
  languages?: string[];
  safetyTrainingHours?: number;
  employmentType?: "permanent" | "contract" | "any";
  /** Profile photo (data URL in the demo, storage URL in production). */
  photoUrl?: string;
  /** Past jobs, newest first. Many workers have no resume, so this is their work record. */
  workHistory?: WorkHistoryItem[];
}

export interface WorkHistoryItem {
  company: string;
  role: string;
  /** Year started, e.g. "2019". */
  from: string;
  /** Year left. Empty means still working there. */
  to?: string;
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
  /** Main HR contact shown to admin during approval. */
  hrName?: string;
  hrDesignation?: string;
  /** HR mobile. Shown to admin only; pre-fills the HR number on new jobs. */
  hrPhone?: string;
  /** Plants / sites, used as quick picks when posting a job. */
  sites?: string[];
  /** Street / area of the main office or plant (city and state are in location). */
  address?: string;
  pincode?: string;
  /** Logo image (data URL in the demo, storage URL in production). */
  logoUrl?: string;
  /** Hiring for themselves, or a labour contractor / placement agency hiring for others. */
  hiringType?: HiringType;
  verification: VerificationStatus;
  rejectionReason?: string;
  status: AccountStatus;
  createdAt: string;
}

export type HiringType = "direct" | "agency";

export type CompanyDocType = "gst" | "udyam" | "cin" | "other";

/** Verification proof uploaded by the employer. Only admins see it. */
export interface CompanyDocument {
  id: string;
  companyId: string;
  name: string;
  type: CompanyDocType;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  url?: string;
}

export interface WalkIn {
  date: string; // ISO date
  /** Last day, when the walk-in runs for several days. */
  endDate?: string;
  time: string; // "09:00"
  /** Gate closes at, e.g. "13:00". */
  endTime?: string;
  address: string;
  /** Person to ask for at the gate. */
  contactPerson?: string;
  /** Documents to bring, e.g. "Aadhaar copy, ITI certificate, 2 photos". */
  bring?: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  companyVerified: boolean;
  /** Copied from the company, like companyName. */
  companyLogoUrl?: string;
  title: string;
  trade: Trade;
  sector: Sector;
  location: Location;
  payMin?: number;
  payMax?: number;
  payPeriod: PayPeriod;
  /** "in_hand" = what the worker gets after PF/ESI; "ctc" = before deductions. */
  payType?: PayType;
  shift: Shift;
  /** e.g. "8 hours, 6 days a week". */
  workHours?: string;
  jobType: JobType;
  /** Contract jobs only, e.g. "6 months". */
  contractLength?: string;
  walkIn?: WalkIn;
  openings: number;
  experience: ExperienceBand;
  qualifications: string[];
  /** Licences the worker must hold, from the same list workers pick from (LICENCES). */
  licences?: string[];
  benefits: Benefit[];
  responsibilities: string[];
  requirements: string[];
  status: JobStatus;
  postedAt: string;
  deadline?: string;
  siteName?: string; // plant / site, e.g. "Smelter Plant 2"
  /** Street / area of the work site, for a Maps link. */
  address?: string;
  pincode?: string;
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
  /** Person to ask for at the gate. */
  contactPerson?: string;
  /** What to bring, e.g. "Aadhaar, ITI certificate". */
  bring?: string;
  /** Worker's reply to the invite. */
  response?: "attending" | "cant_attend";
  responseNote?: string;
  respondedAt?: string;
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
  /** What the employer offered. Set when the stage moves to "offer". */
  offer?: Offer;
  /** Worker's reply to an offer. Declining also closes the application (stage "withdrawn"). */
  offerResponse?: "accepted" | "declined";
}

export interface Offer {
  pay: number;
  payPeriod: PayPeriod;
  payType?: PayType;
  joiningDate: string; // ISO date
  /** Where to report on the first day. */
  place: string;
  note?: string;
  sentAt: string;
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
  documents: Pick<CompanyDocument, "id" | "name" | "type" | "url" | "mimeType" | "uploadedAt">[];
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

/* ---------- Reports, support, settings ---------- */

export type ReportReason = "asks_money" | "fake" | "wrong_details" | "unsafe" | "other";
export type ReportStatus = "open" | "dismissed" | "job_removed";

export interface JobReport {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  reporterName: string;
  reason: ReportReason;
  details?: string;
  at: string;
  status: ReportStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  contact: string;
  role: Role | "guest";
  topic: string;
  message: string;
  at: string;
  status: "open" | "closed";
}

export interface UserSettings {
  language: "en" | "hi" | "or";
  /** New matching jobs (worker) / new applicants (employer). */
  jobAlerts: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
  /** Worker only: let employers find this profile in "Find workers". */
  visibleToEmployers: boolean;
}

export interface PlatformSettings {
  /** New companies go live without admin approval (not recommended). */
  autoApproveCompanies: boolean;
  /** Workers and HR can message each other after shortlisting. */
  messagingEnabled: boolean;
  /** Employers can search all workers who allow it. */
  talentSearchEnabled: boolean;
}

/* ---------- Messages ---------- */

export interface Message {
  id: string;
  applicationId: string;
  fromUserId: string;
  fromRole: "worker" | "employer";
  text: string;
  at: string;
  /** Only on your own messages: the id your app made when sending. */
  clientId?: string;
  /** Only on your own messages: the other side has opened the chat since (✓✓). */
  seen?: boolean;
}

export interface MessageThread {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  workerName: string;
  /** Name of the person on the other side. */
  otherName: string;
  stage: ApplicationStage;
  lastMessage?: string;
  lastAt?: string;
  unread: number;
  /** False when the application is closed or messaging is off. */
  canSend: boolean;
}

/** One page of a chat, oldest first. `hasMore`: there are older messages to load. */
export interface MessagePage {
  thread: MessageThread;
  messages: Message[];
  hasMore: boolean;
}

/* ---------- Employer: find workers, analytics ---------- */

/** A worker as seen in "Find workers". No phone, email or documents until they apply. */
export interface TalentProfile {
  userId: string;
  name: string;
  trade?: Trade;
  experience?: ExperienceBand;
  qualifications: string[];
  licences: string[];
  skills: string[];
  location?: Location;
  willingToRelocate: boolean;
  expectedPay?: number;
  availability: Availability;
  languages?: string[];
  safetyTrainingHours?: number;
  photoUrl?: string;
  /** Job ids this company already invited the worker to. */
  invitedTo: string[];
  /** Job ids the worker already applied to at this company. */
  appliedTo: string[];
}

export interface EmployerAnalytics {
  totalApplicants: number;
  hired: number;
  /** Hired ÷ openings across active jobs, 0–100. */
  fillRate: number;
  /** Average days from applying to hired. */
  avgDaysToHire: number | null;
  /** Share of applicants who sent a resume file (rest used their profile). */
  resumeShare: number;
  applicantsPerWeek: { week: string; count: number }[];
  byState: { state: string; count: number }[];
  byJob: { jobId: string; title: string; openings: number; applied: number; shortlisted: number; interview: number; hired: number }[];
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
  openReports: number;
  openTickets: number;
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
  "id" | "companyId" | "companyName" | "companyVerified" | "companyLogoUrl" | "postedAt" | "applicantsCount" | "newApplicantsCount"
>;
