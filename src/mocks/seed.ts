/**
 * Fake starting data for the demo. Only the mock API (src/mocks) reads this;
 * UI code never imports it directly.
 */
import type {
  Application, AppNotification, AuditEntry, Company, CompanyDocument, Job, JobReport, Message, PlatformSettings, SupportTicket, User, UserSettings, WorkerDocument, WorkerProfile,
} from "@/types";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();
const ahead = (days: number, hour = 10) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export interface MockDb {
  users: (User & { password?: string })[];
  workers: WorkerProfile[];
  companies: Company[];
  jobs: Job[];
  applications: Application[];
  documents: WorkerDocument[];
  /** Company verification proof. Added later, so older saved demo data may not have it. */
  companyDocs?: CompanyDocument[];
  saved: Record<string, string[]>; // workerId -> jobIds
  notifications: AppNotification[];
  audit: AuditEntry[];
  reports: JobReport[];
  tickets: SupportTicket[];
  messages: Message[];
  settings: Record<string, UserSettings>; // userId -> settings
  invites: { companyId: string; workerId: string; jobId: string; at: string }[];
  platform: PlatformSettings;
  passwordResets: { token: string; userId: string; expiresAt: string }[];
  /** `${userId}:${applicationId}` -> last time the user opened that conversation. */
  reads: Record<string, string>;
}

export const DEFAULT_SETTINGS: UserSettings = { language: "en", jobAlerts: true, smsAlerts: true, whatsappAlerts: true, visibleToEmployers: true };

export function createSeed(): MockDb {
  const users: MockDb["users"] = [
    { id: "u-w1", role: "worker", name: "Rajan Mehta", phone: "9876543210", status: "active", onboarded: true, createdAt: ago(60) },
    { id: "u-w2", role: "worker", name: "Suresh Kumar", phone: "9811122233", status: "active", onboarded: true, createdAt: ago(40) },
    { id: "u-w3", role: "worker", name: "Amit Prasad", phone: "9822233344", status: "active", onboarded: true, createdAt: ago(35) },
    { id: "u-w4", role: "worker", name: "Gurpreet Singh", phone: "9833344455", status: "active", onboarded: true, createdAt: ago(3) },
    { id: "u-w5", role: "worker", name: "Karthik Rao", phone: "9844455566", status: "active", onboarded: true, createdAt: ago(20) },
    { id: "u-w6", role: "worker", name: "Manoj Das", phone: "9855566677", status: "blocked", onboarded: true, createdAt: ago(80) },
    { id: "u-w7", role: "worker", name: "Ravi Teja", phone: "9866677788", status: "active", onboarded: true, createdAt: ago(1) },
    { id: "u-e1", role: "employer", name: "Priya Sharma", email: "hr@vedanta.demo", password: "demo1234", status: "active", onboarded: true, companyId: "c-1", createdAt: ago(120) },
    { id: "u-e2", role: "employer", name: "Vikram Joshi", email: "hr@coastal.demo", password: "demo1234", status: "active", onboarded: true, companyId: "c-2", createdAt: ago(90) },
    { id: "u-e3", role: "employer", name: "Anita Roy", email: "hr@eastline.demo", password: "demo1234", status: "pending", onboarded: true, companyId: "c-3", createdAt: ago(2) },
    { id: "u-e4", role: "employer", name: "Deepak Nair", email: "hr@petrosafe.demo", password: "demo1234", status: "pending", onboarded: true, companyId: "c-4", createdAt: ago(1) },
    { id: "u-a1", role: "admin", name: "Neha Kapoor", email: "admin@industrialink.demo", password: "demo1234", status: "active", onboarded: true, createdAt: ago(200) },
  ];

  const workers: WorkerProfile[] = [
    {
      userId: "u-w1", name: "Rajan Mehta", phone: "9876543210", trade: "welder", experience: "3_5",
      qualifications: ["10th", "ITI"], licences: ["Welding cert"], location: { city: "Jharsuguda", state: "Odisha" },
      willingToRelocate: true, expectedPay: 22000, shiftPreference: "any", availability: "15_days",
      skills: ["Arc welding", "MIG welding", "Gas cutting", "Blueprint reading"], email: "rajan.mehta@gmail.demo", dob: "1996-04-12", gender: "male", pincode: "768201",
      languages: ["Hindi", "Odia"], safetyTrainingHours: 40, employmentType: "permanent",
      about: "ITI welder with 4 years in an aluminium smelter. Comfortable with night shifts.",
      workHistory: [
        { company: "Hindalco, Hirakud", role: "Welder", from: "2021" },
        { company: "Sai Fabricators, Sambalpur", role: "Helper welder", from: "2019", to: "2021" },
      ],
    },
    {
      userId: "u-w2", name: "Suresh Kumar", phone: "9811122233", trade: "machine_operator", experience: "5_plus",
      qualifications: ["12th", "ITI"], licences: ["DGMS"], location: { city: "Dhanbad", state: "Jharkhand" },
      willingToRelocate: true, expectedPay: 28000, shiftPreference: "rotational", availability: "immediate",
      skills: ["Dumper operation", "Shovel operation"], languages: ["Hindi"], safetyTrainingHours: 120, employmentType: "any",
    },
    {
      userId: "u-w3", name: "Amit Prasad", phone: "9822233344", trade: "electrician", experience: "3_5",
      qualifications: ["ITI"], licences: ["Electrical licence"], location: { city: "Patna", state: "Bihar" },
      willingToRelocate: true, expectedPay: 24000, shiftPreference: "day", availability: "immediate",
      skills: ["Panel wiring", "Motor rewinding", "HT/LT maintenance"],
    },
    {
      userId: "u-w4", name: "Gurpreet Singh", phone: "9833344455", trade: "driver", experience: "5_plus",
      qualifications: ["10th"], licences: ["HMV licence"], location: { city: "Ludhiana", state: "Punjab" },
      willingToRelocate: false, expectedPay: 26000, shiftPreference: "any", availability: "immediate",
      skills: ["Trailer driving", "Long route"],
    },
    {
      userId: "u-w5", name: "Karthik Rao", phone: "9844455566", trade: "crane_operator", experience: "3_5",
      qualifications: ["12th", "Diploma"], licences: ["Crane licence"], location: { city: "Visakhapatnam", state: "Andhra Pradesh" },
      willingToRelocate: true, expectedPay: 30000, shiftPreference: "rotational", availability: "30_days",
      skills: ["Gantry crane", "Mobile crane", "Rigging"], languages: ["Telugu", "Hindi", "English"], safetyTrainingHours: 60,
      workHistory: [{ company: "Visakhapatnam Port Trust contractor", role: "Mobile crane operator", from: "2020", to: "2024" }],
    },
    {
      userId: "u-w6", name: "Manoj Das", phone: "9855566677", trade: "helper", experience: "1_2",
      qualifications: ["Below 10th"], licences: [], location: { city: "Cuttack", state: "Odisha" },
      willingToRelocate: true, expectedPay: 12000, shiftPreference: "any", availability: "immediate",
      skills: ["Loading", "Housekeeping"],
    },
    {
      userId: "u-w7", name: "Ravi Teja", phone: "9866677788", trade: "fitter", experience: "1_2",
      qualifications: ["ITI"], licences: [], location: { city: "Hyderabad", state: "Telangana" },
      willingToRelocate: true, expectedPay: 18000, shiftPreference: "day", availability: "immediate",
      skills: ["Pipe fitting", "Bearing replacement"],
    },
  ];

  const companies: Company[] = [
    { id: "c-1", name: "Vedanta Aluminium", sector: "metals", size: "1000+", location: { city: "Jharsuguda", state: "Odisha" }, website: "vedanta.demo", gstNumber: "21AAACV1234F1Z5", about: "Large aluminium smelter and power plant in western Odisha.", hrName: "Priya Sharma", hrDesignation: "HR Manager", hrPhone: "9000000001", address: "Bhurkamunda, PO Sripura", pincode: "768202", hiringType: "direct", sites: ["Smelter Plant 2", "Power Plant", "Main Gate Workshop"], verification: "approved", status: "active", createdAt: ago(120) },
    { id: "c-2", name: "Coastal Port Services", sector: "shipping", size: "200–1000", location: { city: "Visakhapatnam", state: "Andhra Pradesh" }, gstNumber: "37AABCC5678K1Z2", about: "Cargo handling and stevedoring at Vizag port.", verification: "approved", status: "active", createdAt: ago(90) },
    { id: "c-3", name: "Eastline Logistics", sector: "logistics", size: "50–200", location: { city: "Kolkata", state: "West Bengal" }, gstNumber: "19AAECE9012L1Z8", about: "Truck fleet and warehousing across East India.", hrName: "Anita Roy", hrDesignation: "HR Executive", hrPhone: "9000000003", address: "Plot 14, Dankuni Industrial Area", pincode: "712311", hiringType: "direct", verification: "pending", status: "pending", createdAt: ago(2) },
    { id: "c-4", name: "PetroSafe Contractors", sector: "petroleum", size: "50–200", location: { city: "Jamnagar", state: "Gujarat" }, gstNumber: "24AAFCP3456M1Z1", about: "Maintenance contractor for refineries.", hrPhone: "9000000004", hiringType: "agency", verification: "pending", status: "pending", createdAt: ago(1) },
    { id: "c-5", name: "BlackRock Mining Co.", sector: "mining", size: "1000+", location: { city: "Dhanbad", state: "Jharkhand" }, gstNumber: "20AABCB7890N1Z4", about: "Open-cast coal mining.", verification: "approved", status: "active", createdAt: ago(150) },
    { id: "c-6", name: "Pune Auto Components", sector: "automotive", size: "200–1000", location: { city: "Pune", state: "Maharashtra" }, gstNumber: "27AACCP1122P1Z9", about: "Pressed and welded parts for car makers.", verification: "approved", status: "active", createdAt: ago(100) },
  ];

  const co = (id: string) => companies.find((c) => c.id === id)!;
  const job = (p: Partial<Job> & Pick<Job, "id" | "companyId" | "title" | "trade">): Job => ({
    companyName: co(p.companyId).name,
    companyVerified: co(p.companyId).verification === "approved",
    sector: co(p.companyId).sector,
    location: co(p.companyId).location,
    payPeriod: "month",
    shift: "day",
    jobType: "full_time",
    openings: 1,
    experience: "1_2",
    qualifications: [],
    benefits: [],
    responsibilities: [],
    requirements: [],
    status: "active",
    postedAt: ago(3),
    hrPhone: "9000000001",
    allowCalls: true,
    callHours: "10 AM – 6 PM",
    applicantsCount: 0,
    newApplicantsCount: 0,
    ...p,
  });

  const jobs: Job[] = [
    job({
      id: "j-1", companyId: "c-1", title: "Welder (ITI)", trade: "welder", siteName: "Smelter Plant 2", payMin: 18000, payMax: 22000, shift: "rotational",
      openings: 10, experience: "1_2", qualifications: ["ITI"], benefits: ["food", "stay", "pf_esi", "overtime"],
      responsibilities: ["Weld steel structures and pot lines", "Do gas cutting as per drawing", "Follow safety permits on every job"],
      requirements: ["ITI in Welder trade", "1+ year experience in plant or fabrication", "Ready for rotational shifts"],
      licences: ["Welding cert"], payType: "in_hand", workHours: "8 hours, 6 days a week", address: "Smelter Plant 2, Bhurkamunda", pincode: "768202",
      postedAt: ago(2), deadline: ahead(20), applicantsCount: 24, newApplicantsCount: 12,
    }),
    job({
      id: "j-2", companyId: "c-1", title: "Shift Supervisor – Smelter", trade: "supervisor", siteName: "Smelter Plant 1", payMin: 35000, payMax: 45000, shift: "rotational",
      openings: 2, experience: "5_plus", qualifications: ["Diploma"], benefits: ["stay", "pf_esi", "transport"],
      responsibilities: ["Lead a team of 20 operators", "Daily production and safety report"],
      requirements: ["Diploma in Mechanical/Electrical", "5+ years in smelter or heavy plant"],
      postedAt: ago(6), deadline: ahead(10), applicantsCount: 9, newApplicantsCount: 2,
    }),
    job({
      id: "j-3", companyId: "c-1", title: "Crane Operator (EOT)", trade: "crane_operator", payMin: 24000, payMax: 28000, shift: "rotational",
      openings: 3, experience: "3_5", qualifications: ["12th"], benefits: ["food", "pf_esi", "hazard_pay"],
      responsibilities: ["Operate EOT cranes in cast house", "Daily crane checklist"],
      requirements: ["Crane operator certificate", "3+ years experience"],
      postedAt: ago(1), deadline: ahead(2), applicantsCount: 5, newApplicantsCount: 5,
    }),
    job({
      id: "j-4", companyId: "c-1", title: "Electrician – Power Plant", trade: "electrician", status: "draft", payMin: 22000, payMax: 26000,
      openings: 4, experience: "3_5", qualifications: ["ITI"], benefits: ["stay", "pf_esi"], postedAt: ago(0, 5),
      responsibilities: ["Maintain HT/LT panels"], requirements: ["ITI Electrician", "Wireman licence"],
    }),
    job({
      id: "j-5", companyId: "c-1", title: "Helper – Material Handling", trade: "helper", status: "closed", payMin: 550, payMax: 600, payPeriod: "day",
      openings: 15, experience: "fresher", benefits: ["food"], postedAt: ago(45), applicantsCount: 61,
      responsibilities: ["Loading and unloading", "Housekeeping in stores"], requirements: ["Physically fit"],
    }),
    job({
      id: "j-6", companyId: "c-2", title: "Gantry Crane Operator", trade: "crane_operator", allowCalls: false, payMin: 28000, payMax: 34000, shift: "rotational",
      openings: 6, experience: "3_5", qualifications: ["12th"], benefits: ["transport", "pf_esi", "overtime"],
      responsibilities: ["Operate quay gantry cranes", "Coordinate with signalman"], requirements: ["Crane licence", "Port experience preferred"],
      postedAt: ago(4), applicantsCount: 14, newApplicantsCount: 3, hrPhone: "9000000002",
    }),
    job({
      id: "j-7", companyId: "c-2", title: "Forklift Operator – Walk-in", trade: "machine_operator", payMin: 700, payPeriod: "day", jobType: "walk_in",
      walkIn: { date: ahead(4).slice(0, 10), endDate: ahead(6).slice(0, 10), time: "09:00", endTime: "13:00", address: "Gate 3, Coastal Port Services, Vizag Port Area", contactPerson: "Mr. Rao, security office", bring: "Aadhaar copy, 2 photos, forklift licence if you have one" },
      openings: 20, experience: "1_2", benefits: ["food", "transport"], postedAt: ago(1),
      responsibilities: ["Move cargo inside the yard"], requirements: ["Forklift licence or experience", "Bring Aadhaar and 2 photos"],
      applicantsCount: 8, newApplicantsCount: 8, hrPhone: "9000000002",
    }),
    job({
      id: "j-8", companyId: "c-5", title: "Dumper Operator", trade: "driver", payMin: 26000, payMax: 32000, shift: "rotational",
      openings: 12, experience: "3_5", qualifications: ["10th"], benefits: ["stay", "food", "pf_esi", "hazard_pay"],
      responsibilities: ["Operate 60T dumpers in open-cast mine"], requirements: ["HMV licence", "DGMS certificate preferred"], licences: ["HMV licence"], workHours: "12 hours, 6 days a week",
      postedAt: ago(5), applicantsCount: 31, newApplicantsCount: 4, hrPhone: "9000000005",
    }),
    job({
      id: "j-9", companyId: "c-5", title: "Mine Electrician", trade: "electrician", payMin: 25000, payMax: 30000, shift: "rotational",
      openings: 4, experience: "3_5", qualifications: ["ITI"], benefits: ["stay", "pf_esi", "hazard_pay"],
      responsibilities: ["Maintain mine electrical systems"], requirements: ["ITI Electrician", "DGMS electrical supervisor certificate"],
      postedAt: ago(8), applicantsCount: 11, hrPhone: "9000000005",
    }),
    job({
      id: "j-10", companyId: "c-6", title: "CNC / Press Machine Operator", trade: "machine_operator", payMin: 16000, payMax: 19000, shift: "day",
      openings: 8, experience: "1_2", qualifications: ["ITI"], benefits: ["food", "transport", "pf_esi"],
      responsibilities: ["Run press and CNC machines", "Check part quality"], requirements: ["ITI Fitter/Machinist"],
      postedAt: ago(3), applicantsCount: 19, hrPhone: "9000000006",
    }),
    job({
      id: "j-11", companyId: "c-6", title: "MIG Welder – Body Shop", trade: "welder", payMin: 17000, payMax: 21000, shift: "day",
      openings: 5, experience: "1_2", qualifications: ["ITI"], benefits: ["food", "pf_esi", "overtime"],
      responsibilities: ["MIG welding of car body parts"], requirements: ["ITI Welder", "MIG experience"],
      postedAt: ago(9), applicantsCount: 22, hrPhone: "9000000006",
    }),
    job({
      id: "j-12", companyId: "c-3", title: "Truck Driver (HMV)", trade: "driver", payMin: 22000, payMax: 26000,
      openings: 10, experience: "3_5", benefits: ["food", "overtime"], postedAt: ago(1),
      responsibilities: ["Long-route trips across East India"], requirements: ["HMV licence, 3+ years"], licences: ["HMV licence"], jobType: "contract", contractLength: "11 months",
      hrPhone: "9000000003",
    }),
    job({
      id: "j-13", companyId: "c-2", title: "Security Guard – Port", trade: "security", payMin: 14000, payMax: 16000, shift: "night",
      openings: 15, experience: "fresher", qualifications: ["10th"], benefits: ["pf_esi", "transport"],
      responsibilities: ["Gate security and patrolling"], requirements: ["10th pass", "Height 5'6\"+"],
      postedAt: ago(12), applicantsCount: 40, hrPhone: "9000000002",
    }),
    job({
      id: "j-14", companyId: "c-5", title: "Pipe Fitter", trade: "fitter", shift: "day",
      openings: 3, experience: "1_2", qualifications: ["ITI"], benefits: ["stay"],
      responsibilities: ["Fit and repair water and slurry pipelines"], requirements: ["ITI Fitter"],
      postedAt: ago(15), applicantsCount: 6, hrPhone: "9000000005",
    }),
  ];

  const app = (p: Partial<Application> & Pick<Application, "id" | "jobId" | "workerId" | "stage">, daysAgo: number): Application => {
    const order = ["applied", "shortlisted", "interview", "offer", "hired"] as const;
    const reached = p.stage === "rejected" || p.stage === "withdrawn" ? 1 : order.indexOf(p.stage as (typeof order)[number]) + 1;
    const timeline: Application["timeline"] = [{ stage: "applied", at: ago(daysAgo) }];
    if (reached >= 1 && p.stage !== "applied") timeline.push({ stage: "viewed", at: ago(daysAgo - 0.5) });
    for (let i = 1; i < reached; i++) timeline.push({ stage: order[i]!, at: ago(Math.max(daysAgo - i, 0)) });
    if (p.stage === "rejected" || p.stage === "withdrawn") timeline.push({ stage: p.stage, at: ago(Math.max(daysAgo - 2, 0)) });
    return { appliedAt: ago(daysAgo), updatedAt: timeline[timeline.length - 1]!.at, timeline, sentWith: "profile", ...p };
  };

  const applications: Application[] = [
    app({ id: "a-1", jobId: "j-2", workerId: "u-w1", stage: "interview", interview: { at: ahead(1, 10), place: "Admin Building, Vedanta Aluminium, Jharsuguda", contactPerson: "Priya at reception", bring: "ITI certificate, Aadhaar, 2 passport photos" } }, 6),
    app({ id: "a-2", jobId: "j-6", workerId: "u-w1", stage: "shortlisted" }, 4),
    app({ id: "a-3", jobId: "j-10", workerId: "u-w1", stage: "applied" }, 2),
    app({ id: "a-4", jobId: "j-11", workerId: "u-w1", stage: "rejected", rejectionNote: "Position filled" }, 9),
    app({ id: "a-5", jobId: "j-1", workerId: "u-w2", stage: "applied", sentWith: "document", documentId: "d-6" }, 1),
    app({ id: "a-6", jobId: "j-1", workerId: "u-w3", stage: "shortlisted" }, 2),
    app({ id: "a-7", jobId: "j-1", workerId: "u-w5", stage: "interview", sentWith: "document", documentId: "d-7", interview: { at: ahead(2, 11), place: "HR Office, Gate 1" } }, 2),
    app({ id: "a-8", jobId: "j-1", workerId: "u-w7", stage: "applied" }, 0.2),
    app({ id: "a-9", jobId: "j-1", workerId: "u-w4", stage: "offer", offer: { pay: 21000, payPeriod: "month", payType: "in_hand", joiningDate: ahead(10).slice(0, 10), place: "HR Office, Gate 1, Smelter Plant 2", note: "Bring your bank passbook for salary account.", sentAt: ago(0, 12) } }, 2),
    app({ id: "a-10", jobId: "j-1", workerId: "u-w6", stage: "rejected", rejectionNote: "Experience below requirement" }, 2),
    app({ id: "a-11", jobId: "j-2", workerId: "u-w2", stage: "shortlisted" }, 5),
    app({ id: "a-12", jobId: "j-3", workerId: "u-w5", stage: "applied" }, 1),
    app({ id: "a-13", jobId: "j-2", workerId: "u-w3", stage: "hired" }, 6),
  ];

  // Files in /public/demo so HR can actually open them in the demo.
  const documents: WorkerDocument[] = [
    { id: "d-1", ownerId: "u-w1", name: "Rajan_Mehta_Resume.pdf", type: "resume", sizeBytes: 1_240_000, mimeType: "application/pdf", uploadedAt: ago(30), url: "/demo/resume-rajan.pdf", isDefaultResume: true },
    { id: "d-2", ownerId: "u-w1", name: "Aadhaar_XXXX_4821.png", type: "id_proof", sizeBytes: 640_000, mimeType: "image/png", uploadedAt: ago(30), url: "/demo/id-card.svg" },
    { id: "d-3", ownerId: "u-w1", name: "ITI_Welder_Certificate.png", type: "iti_diploma", sizeBytes: 910_000, mimeType: "image/png", uploadedAt: ago(10), url: "/demo/certificate.svg" },
    { id: "d-4", ownerId: "u-w4", name: "HMV_Licence.png", type: "driving_licence", sizeBytes: 520_000, mimeType: "image/png", uploadedAt: ago(3), url: "/demo/certificate.svg" },
    { id: "d-5", ownerId: "u-w7", name: "ITI_Fitter.pdf", type: "iti_diploma", sizeBytes: 300_000, mimeType: "application/pdf", uploadedAt: ago(1), url: "/demo/resume-generic.pdf" },
    { id: "d-6", ownerId: "u-w2", name: "Suresh_Kumar_Resume.pdf", type: "resume", sizeBytes: 450_000, mimeType: "application/pdf", uploadedAt: ago(0, 6), url: "/demo/resume-generic.pdf", isDefaultResume: true },
    { id: "d-7", ownerId: "u-w5", name: "Karthik_CV.pdf", type: "resume", sizeBytes: 380_000, mimeType: "application/pdf", uploadedAt: ago(15), url: "/demo/resume-generic.pdf", isDefaultResume: true },
  ];


  // Verification proof for the companies waiting for approval.
  const companyDocs: CompanyDocument[] = [
    { id: "cd-1", companyId: "c-3", name: "GST_Certificate_Eastline.png", type: "gst", sizeBytes: 410_000, mimeType: "image/svg+xml", uploadedAt: ago(2), url: "/demo/certificate.svg" },
    { id: "cd-2", companyId: "c-4", name: "Udyam_PetroSafe.pdf", type: "udyam", sizeBytes: 220_000, mimeType: "application/pdf", uploadedAt: ago(1), url: "/demo/resume-generic.pdf" },
  ];

  const notifications: AppNotification[] = [
    { id: "n-1", userId: "u-w1", title: "Interview scheduled", body: "Vedanta Aluminium invited you for an interview tomorrow at 10:00 AM.", at: ago(0, 3), read: false, link: "/worker/applications/a-1" },
    { id: "n-2", userId: "u-w1", title: "You were shortlisted", body: "Coastal Port Services shortlisted you for Gantry Crane Operator.", at: ago(1), read: false, link: "/worker/applications/a-2" },
    { id: "n-3", userId: "u-w1", title: "New welder jobs near you", body: "3 new welder jobs were posted in Odisha this week.", at: ago(2), read: true, link: "/worker/jobs?trade=welder" },
    { id: "n-4", userId: "u-e1", title: "12 new applicants", body: "Welder (ITI) has 12 new applicants.", at: ago(0, 2), read: false, link: "/employer/jobs/j-1" },
    { id: "n-5", userId: "u-e1", title: "Crane Operator closes soon", body: "Your job closes in 2 days.", at: ago(0, 8), read: false, link: "/employer/jobs/j-3" },
    { id: "n-6", userId: "u-a1", title: "New company signed up", body: "PetroSafe Contractors is waiting for verification.", at: ago(1), read: false, link: "/admin/verifications" },
  ];

  const audit: AuditEntry[] = [
    { id: "l-1", at: ago(1), actor: "Neha Kapoor", action: "Removed job", target: "Loader – Daily cash (reported as fake)" },
    { id: "l-2", at: ago(4), actor: "Neha Kapoor", action: "Blocked worker", target: "Manoj Das" },
    { id: "l-3", at: ago(7), actor: "Neha Kapoor", action: "Approved company", target: "Pune Auto Components" },
  ];

  const reports: JobReport[] = [
    { id: "r-1", jobId: "j-12", jobTitle: jobs.find((j) => j.id === "j-12")?.title ?? "Job", companyName: jobs.find((j) => j.id === "j-12")?.companyName ?? "", reporterName: "Manoj Das", reason: "asks_money", details: "Caller asked ₹2,000 for a uniform before joining.", at: ago(0, 5), status: "open" },
    { id: "r-2", jobId: "j-9", jobTitle: jobs.find((j) => j.id === "j-9")?.title ?? "Job", companyName: jobs.find((j) => j.id === "j-9")?.companyName ?? "", reporterName: "Ravi Teja", reason: "wrong_details", details: "Pay on call was lower than shown.", at: ago(2), status: "open" },
  ];

  const tickets: SupportTicket[] = [
    { id: "t-1", userId: "u-w4", name: "Gurpreet Singh", contact: "+91 9833344455", role: "worker", topic: "Change my mobile number", message: "I have a new SIM. Old number 9833344455, new number 9888800011.", at: ago(1), status: "open" },
  ];

  const messages: Message[] = [
    { id: "m-1", applicationId: "a-1", fromUserId: "u-e1", fromRole: "employer", text: "Hi Rajan, please bring your ITI certificate and one ID proof for the interview.", at: ago(0, 4) },
    { id: "m-2", applicationId: "a-1", fromUserId: "u-w1", fromRole: "worker", text: "Okay sir, I will bring both. Which gate should I come to?", at: ago(0, 3) },
    { id: "m-3", applicationId: "a-1", fromUserId: "u-e1", fromRole: "employer", text: "Gate 2, Admin Building. Ask for Priya at reception.", at: ago(0, 2) },
  ];

  return {
    users, workers, companies, jobs, applications, documents, companyDocs, notifications, audit, reports, tickets, messages,
    saved: { "u-w1": ["j-1", "j-8", "j-14"] },
    settings: {},
    invites: [],
    platform: { autoApproveCompanies: false, messagingEnabled: true, talentSearchEnabled: true },
    passwordResets: [],
    reads: { "u-w1:a-1": ago(0, 2.5), "u-e1:a-1": ago(0, 1) },
  };
}
