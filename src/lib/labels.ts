/**
 * Every user-facing label for enums lives here, so translation (e.g. Hindi)
 * can be added later in one place.
 */
import type {
  ApplicationStage, Availability, Benefit, DocType, ExperienceBand, JobType, Sector, Shift, Trade,
} from "@/types";

export const TRADE_LABEL: Record<Trade, string> = {
  welder: "Welder",
  electrician: "Electrician",
  fitter: "Fitter",
  machine_operator: "Machine operator",
  driver: "Driver",
  crane_operator: "Crane operator",
  helper: "Helper",
  security: "Security guard",
  supervisor: "Supervisor",
  other: "Other",
};

export const SECTOR_LABEL: Record<Sector, string> = {
  mining: "Mining",
  metals: "Aluminium & Metals",
  shipping: "Shipping & Ports",
  petroleum: "Oil & Gas",
  logistics: "Logistics",
  automotive: "Automotive",
};

export const EXPERIENCE_LABEL: Record<ExperienceBand, string> = {
  fresher: "Fresher",
  "1_2": "1–2 years",
  "3_5": "3–5 years",
  "5_plus": "5+ years",
};

export const SHIFT_LABEL: Record<Shift | "any", string> = {
  day: "Day shift",
  night: "Night shift",
  rotational: "Rotational shift",
  any: "Any shift",
};

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  full_time: "Full-time",
  contract: "Contract",
  walk_in: "Walk-in interview",
};

export const BENEFIT_LABEL: Record<Benefit, string> = {
  food: "Food",
  stay: "Stay",
  transport: "Transport",
  pf_esi: "PF/ESI",
  overtime: "Overtime pay",
  hazard_pay: "Hazard pay",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  immediate: "Can join immediately",
  "15_days": "Can join in 15 days",
  "30_days": "Can join in 30 days",
};

/** Worker-facing stage names are kinder ("Not selected" instead of "Rejected"). */
export const STAGE_LABEL_WORKER: Record<ApplicationStage, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer received",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const PIPELINE_STAGES: ApplicationStage[] = ["applied", "shortlisted", "interview", "offer", "hired"];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  resume: "Resume",
  id_proof: "Aadhaar / ID proof",
  iti_diploma: "ITI / Diploma",
  trade_licence: "DGMS / Trade licence",
  driving_licence: "Driving licence",
  experience_letter: "Experience letter",
  safety_cert: "Safety training",
};

export const QUALIFICATIONS = ["Below 10th", "10th", "12th", "ITI", "Diploma", "Graduate"];
export const LICENCES = ["DGMS", "HMV licence", "LMV licence", "Forklift", "Crane licence", "Welding cert", "Electrical licence"];

export const EMPLOYMENT_TYPE_LABEL: Record<"permanent" | "contract" | "any", string> = {
  permanent: "Permanent job",
  contract: "Contract work",
  any: "Permanent or contract",
};
