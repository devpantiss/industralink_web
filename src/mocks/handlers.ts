/**
 * Mock API endpoints. Each route mirrors one endpoint of the real backend
 * (see API_CONTRACT.md). When the backend is ready, set VITE_USE_MOCKS=false
 * and nothing in the UI needs to change.
 */
import type {
  AdminJobRow, AdminSummary, AdminUserRow, Application, ApplicationStage, Candidate, Company, CompanyForWorker, EmployerAnalytics, EmployerSummary, Job,
  JobForWorker, JobReport, Message, MessageThread, Paginated, TalentProfile, User, UserSettings, VerificationItem, WorkerApplication, WorkerDocument, WorkerProfile, WorkerSummary,
} from "@/types";
import { SECTOR_LABEL, TRADE_LABEL } from "@/lib/labels";
import { getDb, newId, now, saveDb } from "./db";
import { DEFAULT_SETTINGS } from "./seed";
import { HttpError, route, type MockRequest } from "./router";

/* ---------------- helpers ---------------- */

const db = () => getDb();
const publicUser = (u: User & { password?: string }): User => {
  const { password: _pw, ...rest } = u;
  return rest;
};
const token = (u: User) => `mock.${u.id}`;

function need(req: MockRequest, role?: User["role"]): User {
  if (!req.user) throw new HttpError(401, "Please log in again.", "UNAUTHENTICATED");
  if (req.user.status === "blocked") throw new HttpError(403, "Your account is suspended. Contact support.", "BLOCKED");
  if (role && req.user.role !== role) throw new HttpError(403, "You don't have access to this.", "FORBIDDEN");
  return req.user;
}

const findJob = (id: string) => {
  const j = db().jobs.find((x) => x.id === id);
  if (!j) throw new HttpError(404, "This job was removed or doesn't exist.", "NOT_FOUND");
  return j;
};

const myCompanyId = (u: User) => {
  if (!u.companyId) throw new HttpError(400, "No company linked to this account.");
  return u.companyId;
};

const ownJob = (u: User, id: string) => {
  const j = findJob(id);
  if (j.companyId !== myCompanyId(u)) throw new HttpError(404, "Job not found.", "NOT_FOUND");
  return j;
};

function forWorker(job: Job, workerId: string): JobForWorker {
  const app = db().applications.find((a) => a.jobId === job.id && a.workerId === workerId && a.stage !== "withdrawn");
  const { hrPhone: _private, ...publicJob } = job; // HR number stays private until shortlisted
  return { ...publicJob, saved: (db().saved[workerId] ?? []).includes(job.id), appliedApplicationId: app?.id };
}

function notify(userId: string, title: string, body: string, link?: string) {
  db().notifications.unshift({ id: newId("n"), userId, title, body, at: now(), read: false, link });
}

function audit(actor: User, action: string, target: string) {
  db().audit.unshift({ id: newId("l"), at: now(), actor: actor.name, action, target });
}

/** What the worker still has to add. Order = priority shown in the banner. */
function profileChecks(p: WorkerProfile, docs: WorkerDocument[]) {
  const checks: { key: string; label: string; link: string; ok: boolean }[] = [
    { key: "resume", label: "Upload your resume", link: "/worker/profile?tab=documents", ok: docs.some((d) => d.type === "resume") },
    { key: "trade", label: "Add your trade and experience", link: "/worker/profile?edit=work", ok: !!p.trade && !!p.experience },
    { key: "city", label: "Add your city", link: "/worker/profile?edit=personal", ok: !!p.location?.city },
    { key: "skills", label: "Add 2–3 skills", link: "/worker/profile?edit=work", ok: p.skills.length > 0 },
    { key: "education", label: "Add your education (ITI, 10th…)", link: "/worker/profile?edit=work", ok: p.qualifications.length > 0 },
    { key: "pay", label: "Add your expected pay", link: "/worker/profile?edit=preferences", ok: !!p.expectedPay },
    { key: "certificate", label: "Upload a certificate or licence", link: "/worker/profile?tab=documents", ok: docs.some((d) => !["resume", "id_proof"].includes(d.type)) },
  ];
  const missing = checks.filter((c) => !c.ok).map(({ ok: _ok, ...rest }) => rest);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

const workerOf = (id: string) => db().workers.find((w) => w.userId === id)!;

/* ---------------- auth ---------------- */

route("POST", "/auth/otp/request", ({ body }) => {
  if (!/^[6-9]\d{9}$/.test(body?.phone ?? "")) throw new HttpError(400, "Enter a valid 10-digit mobile number.", "INVALID_PHONE");
  const exists = db().users.some((u) => u.phone === body.phone);
  return { sent: true, isNewUser: !exists };
});

route("POST", "/auth/otp/verify", ({ body }) => {
  if (!/^\d{6}$/.test(body?.code ?? "")) throw new HttpError(400, "Enter the 6-digit code.", "INVALID_OTP");
  if (body.code === "000000") throw new HttpError(400, "Wrong code. Please try again.", "WRONG_OTP");
  let user = db().users.find((u) => u.phone === body.phone);
  if (user && body.name) throw new HttpError(409, "You already have an account with this number. Log in instead.", "EXISTS");
  if (!user) {
    if (!body.name) throw new HttpError(404, "No account with this number. Please sign up.", "NOT_FOUND");
    user = { id: newId("u"), role: "worker", name: body.name, phone: body.phone, status: "active", onboarded: false, createdAt: now() };
    db().users.push(user);
    db().workers.push({
      userId: user.id, name: body.name, phone: body.phone, qualifications: [], licences: [], skills: [],
      willingToRelocate: true, availability: "immediate",
    });
    saveDb();
  }
  if (user.status === "blocked") throw new HttpError(403, "Your account is suspended. Contact support.", "BLOCKED");
  return { token: token(user), user: publicUser(user) };
});

route("POST", "/auth/login", ({ body }) => {
  const user = db().users.find((u) => u.email?.toLowerCase() === String(body?.email ?? "").toLowerCase());
  if (!user || user.password !== body?.password) throw new HttpError(401, "Email or password is wrong.", "INVALID_CREDENTIALS");
  if (user.status === "blocked") throw new HttpError(403, "Your account is suspended. Contact support.", "BLOCKED");
  return { token: token(user), user: publicUser(user) };
});

route("POST", "/auth/signup/employer", ({ body }) => {
  const email = String(body?.email ?? "").toLowerCase();
  if (db().users.some((u) => u.email?.toLowerCase() === email)) throw new HttpError(409, "An account with this email already exists. Log in instead?", "EXISTS");
  const companyId = newId("c");
  db().companies.push({
    id: companyId, name: body.companyName, sector: "metals", size: "1–50", location: { city: "", state: "" },
    hrName: body.name, verification: db().platform.autoApproveCompanies ? "approved" : "pending",
    status: db().platform.autoApproveCompanies ? "active" : "pending", createdAt: now(),
  });
  const user: User & { password?: string } = {
    id: newId("u"), role: "employer", name: body.name, email, password: body.password, status: db().platform.autoApproveCompanies ? "active" : "pending",
    onboarded: false, companyId, createdAt: now(),
  };
  db().users.push(user);
  saveDb();
  return { token: token(user), user: publicUser(user) };
});

route("GET", "/auth/me", (req) => publicUser(need(req)));
route("POST", "/auth/logout", () => ({ ok: true }));

route("POST", "/auth/onboarding/complete", (req) => {
  const u = need(req);
  const stored = db().users.find((x) => x.id === u.id)!;
  stored.onboarded = true;
  saveDb();
  return publicUser(stored);
});

/* ---------------- notifications ---------------- */

route("GET", "/notifications", (req) => {
  const u = need(req);
  return db().notifications.filter((n) => n.userId === u.id).slice(0, 30);
});
route("POST", "/notifications/read-all", (req) => {
  const u = need(req);
  db().notifications.forEach((n) => n.userId === u.id && (n.read = true));
  saveDb();
  return { ok: true };
});
route("POST", "/notifications/:id/read", (req) => {
  const u = need(req);
  const n = db().notifications.find((x) => x.id === req.params.id && x.userId === u.id);
  if (n) n.read = true;
  saveDb();
  return { ok: true };
});

/* ---------------- worker ---------------- */

route("GET", "/worker/summary", (req): WorkerSummary => {
  const u = need(req, "worker");
  const apps = db().applications.filter((a) => a.workerId === u.id);
  const p = workerOf(u.id);
  const { score, missing } = profileChecks(p, db().documents.filter((d) => d.ownerId === u.id));
  const nextInterview = apps
    .filter((a) => a.stage === "interview" && a.interview && new Date(a.interview.at) > new Date())
    .sort((a, b) => a.interview!.at.localeCompare(b.interview!.at))[0];
  const nextJob = nextInterview && db().jobs.find((j) => j.id === nextInterview.jobId);
  return {
    activeApplications: apps.filter((a) => ["applied", "shortlisted", "interview", "offer"].includes(a.stage)).length,
    interviews: apps.filter((a) => a.stage === "interview").length,
    saved: (db().saved[u.id] ?? []).length,
    profileStrength: score,
    profileHint: missing[0]?.label,
    missing,
    nextStep: nextInterview && nextJob
      ? { title: "Interview", subtitle: `${nextJob.title} · ${nextJob.companyName} · ${nextJob.location.city}`, link: `/worker/applications/${nextInterview.id}`, at: nextInterview.interview!.at }
      : undefined,
  };
});

/** Job search shared by the worker page and the public (no login) page. */
function searchJobs(q: MockRequest["query"], workerId: string | null): Paginated<JobForWorker> {
  const blockedCompanies = new Set(db().companies.filter((c) => c.status === "blocked").map((c) => c.id));
  let list = db().jobs.filter((j) => j.status === "active" && !blockedCompanies.has(j.companyId));
  const text = q.q?.trim().toLowerCase();
  if (text) {
    // Every word must match somewhere: "welder odisha" finds welder jobs in Odisha.
    const words = text.split(/\s+/).filter(Boolean);
    list = list.filter((j) => {
      const hay = [j.title, j.companyName, TRADE_LABEL[j.trade], SECTOR_LABEL[j.sector], j.location.city, j.location.state, j.siteName ?? ""].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  if (q.city) list = list.filter((j) => `${j.location.city} ${j.location.state}`.toLowerCase().includes(q.city!.toLowerCase()));
  if (q.trade) list = list.filter((j) => j.trade === q.trade);
  if (q.sector) list = list.filter((j) => j.sector === q.sector);
  if (q.shift) list = list.filter((j) => j.shift === q.shift);
  if (q.minPay) {
    const min = Number(q.minPay);
    list = list.filter((j) => {
      const top = j.payMax ?? j.payMin;
      if (!top) return false;
      return (j.payPeriod === "day" ? top * 26 : top) >= min;
    });
  }
  if (q.foodStay === "true") list = list.filter((j) => j.benefits.includes("food") || j.benefits.includes("stay"));
  if (q.walkInOnly === "true") list = list.filter((j) => j.jobType === "walk_in");
  if (q.verifiedOnly === "true") list = list.filter((j) => j.companyVerified);

  const home = workerId ? workerOf(workerId).location?.city : undefined;
  const monthly = (j: Job) => ((j.payMax ?? j.payMin ?? 0) * (j.payPeriod === "day" ? 26 : 1));
  if (q.sort === "pay") list.sort((a, b) => monthly(b) - monthly(a));
  else if (q.sort === "nearest" && home) list.sort((a, b) => Number(b.location.city === home) - Number(a.location.city === home));
  else list.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  // jobs without pay go last (plan: rank "Salary not disclosed" lower)
  list.sort((a, b) => Number(!a.payMin && !a.payMax) - Number(!b.payMin && !b.payMax));

  const page = Math.max(1, Number(q.page ?? 1));
  const pageSize = 10;
  return {
    items: list.slice((page - 1) * pageSize, page * pageSize).map((j) => forWorker(j, workerId ?? "")),
    total: list.length, page, pageSize,
  };
}

route("GET", "/jobs", (req) => searchJobs(req.query, need(req, "worker").id));

/** Anyone can search jobs, logged in or not (links from the landing site open this). */
route("GET", "/public/jobs", (req) => searchJobs(req.query, null));

route("GET", "/jobs/:id", (req) => {
  const u = need(req, "worker");
  const j = findJob(req.params.id!);
  if (j.status === "draft") throw new HttpError(404, "This job was removed or doesn't exist.", "NOT_FOUND");
  return forWorker(j, u.id);
});

route("POST", "/jobs/:id/save", (req) => {
  const u = need(req, "worker");
  findJob(req.params.id!);
  const list = (db().saved[u.id] ??= []);
  if (!list.includes(req.params.id!)) list.push(req.params.id!);
  saveDb();
  return { saved: true };
});

route("DELETE", "/jobs/:id/save", (req) => {
  const u = need(req, "worker");
  db().saved[u.id] = (db().saved[u.id] ?? []).filter((id) => id !== req.params.id);
  saveDb();
  return { saved: false };
});

route("GET", "/worker/saved", (req) => {
  const u = need(req, "worker");
  return (db().saved[u.id] ?? [])
    .map((id) => db().jobs.find((j) => j.id === id))
    .filter((j): j is Job => !!j)
    .map((j) => forWorker(j, u.id));
});

route("POST", "/jobs/:id/apply", (req): Application => {
  const u = need(req, "worker");
  const j = findJob(req.params.id!);
  if (j.status !== "active") throw new HttpError(410, "This job is no longer accepting applications.", "JOB_CLOSED");
  if (j.deadline && new Date(j.deadline) < new Date()) throw new HttpError(410, "The last date to apply has passed.", "JOB_CLOSED");
  const existing = db().applications.find((a) => a.jobId === j.id && a.workerId === u.id);
  if (existing && existing.stage !== "withdrawn") throw new HttpError(409, "You have already applied to this job.", "ALREADY_APPLIED");
  if (existing?.stage === "withdrawn") throw new HttpError(409, "You withdrew from this job earlier, so you can't apply again.", "WITHDRAWN");
  if (req.body?.sentWith === "document") {
    const doc = db().documents.find((d) => d.id === req.body.documentId && d.ownerId === u.id);
    if (!doc) throw new HttpError(400, "Choose a resume to send.", "NO_DOCUMENT");
  }
  const at = now();
  const app: Application = {
    id: newId("a"), jobId: j.id, workerId: u.id, stage: "applied", appliedAt: at, updatedAt: at,
    timeline: [{ stage: "applied", at }], sentWith: req.body?.sentWith ?? "profile", documentId: req.body?.documentId,
  };
  db().applications.push(app);
  j.applicantsCount++;
  j.newApplicantsCount++;
  const hr = db().users.find((x) => x.companyId === j.companyId);
  if (hr) notify(hr.id, "New applicant", `${u.name} applied for ${j.title}.`, `/employer/jobs/${j.id}`);
  saveDb();
  return app;
});

/** HR's number is shared only after the employer shortlists the worker, and only if they allow calls. */
function withJob(a: Application): WorkerApplication | null {
  const job = db().jobs.find((j) => j.id === a.jobId);
  if (!job) return null;
  const { hrPhone, ...publicJob } = job;
  const canCall = job.allowCalls && !!hrPhone && ["shortlisted", "interview", "offer", "hired"].includes(a.stage);
  return { ...a, job: publicJob, contact: canCall ? { phone: hrPhone!, hours: job.callHours } : undefined };
}

route("GET", "/worker/applications", (req): WorkerApplication[] => {
  const u = need(req, "worker");
  return db().applications
    .filter((a) => a.workerId === u.id)
    .map(withJob)
    .filter((a): a is WorkerApplication => !!a)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

route("GET", "/worker/applications/:id", (req): WorkerApplication => {
  const u = need(req, "worker");
  const a = db().applications.find((x) => x.id === req.params.id && x.workerId === u.id);
  const full = a && withJob(a);
  if (!full) throw new HttpError(404, "Application not found.", "NOT_FOUND");
  return full;
});

route("POST", "/worker/applications/:id/withdraw", (req) => {
  const u = need(req, "worker");
  const a = db().applications.find((x) => x.id === req.params.id && x.workerId === u.id);
  if (!a) throw new HttpError(404, "Application not found.", "NOT_FOUND");
  if (["hired", "rejected", "withdrawn"].includes(a.stage)) throw new HttpError(409, "This application is already closed.", "CLOSED");
  a.stage = "withdrawn";
  a.updatedAt = now();
  a.timeline.push({ stage: "withdrawn", at: a.updatedAt });
  saveDb();
  return a;
});

route("GET", "/worker/profile", (req) => workerOf(need(req, "worker").id));

route("PATCH", "/worker/profile", (req) => {
  const u = need(req, "worker");
  const p = workerOf(u.id);
  const { userId: _ignore, phone: _phone, ...changes } = req.body ?? {};
  Object.assign(p, changes);
  if (changes.name) db().users.find((x) => x.id === u.id)!.name = changes.name;
  saveDb();
  return p;
});

route("GET", "/worker/documents", (req) => {
  const u = need(req, "worker");
  return db().documents.filter((d) => d.ownerId === u.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
});

const readAsDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(f);
});

route("POST", "/worker/documents", async (req) => {
  const u = need(req, "worker");
  const form = req.body as FormData;
  const file = form?.get?.("file");
  const type = String(form?.get?.("type") ?? "resume") as WorkerDocument["type"];
  if (!(file instanceof File)) throw new HttpError(400, "Please choose a file.", "NO_FILE");
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) throw new HttpError(415, "Please upload a photo (JPG/PNG) or a PDF.", "BAD_TYPE");
  if (file.size > 5 * 1024 * 1024) throw new HttpError(413, "File is too big. Max size is 5 MB.", "TOO_BIG");
  const mine = db().documents.filter((d) => d.ownerId === u.id);
  const doc: WorkerDocument = {
    id: newId("d"), ownerId: u.id, name: file.name, type, sizeBytes: file.size, mimeType: file.type,
    uploadedAt: now(),
    // Demo only: small files are kept as data URLs so previews survive a refresh.
    // The real API returns a storage URL (e.g. Cloudflare R2).
    url: file.size < 700_000 ? await readAsDataUrl(file) : URL.createObjectURL(file),
    isDefaultResume: type === "resume" && !mine.some((d) => d.type === "resume" && d.isDefaultResume),
  };
  db().documents.push(doc);
  saveDb();
  return doc;
});

route("DELETE", "/worker/documents/:id", (req) => {
  const u = need(req, "worker");
  const doc = db().documents.find((d) => d.id === req.params.id && d.ownerId === u.id);
  if (!doc) throw new HttpError(404, "Document not found.", "NOT_FOUND");
  db().documents = db().documents.filter((d) => d !== doc);
  if (doc.isDefaultResume) {
    const next = db().documents.find((d) => d.ownerId === u.id && d.type === "resume");
    if (next) next.isDefaultResume = true;
  }
  saveDb();
  return { ok: true };
});

route("POST", "/worker/documents/:id/default", (req) => {
  const u = need(req, "worker");
  db().documents.forEach((d) => {
    if (d.ownerId === u.id && d.type === "resume") d.isDefaultResume = d.id === req.params.id;
  });
  saveDb();
  return { ok: true };
});

route("GET", "/companies/:id", (req): CompanyForWorker => {
  const u = need(req, "worker");
  const company = db().companies.find((c) => c.id === req.params.id && c.status !== "blocked");
  if (!company) throw new HttpError(404, "Company not found.", "NOT_FOUND");
  const { gstNumber: _gst, ...publicCompany } = company;
  return {
    company: publicCompany,
    jobs: db().jobs.filter((j) => j.companyId === company.id && j.status === "active").map((j) => forWorker(j, u.id)),
  };
});

/* ---------------- employer ---------------- */

route("GET", "/employer/summary", (req): EmployerSummary => {
  const u = need(req, "employer");
  const cid = myCompanyId(u);
  const jobs = db().jobs.filter((j) => j.companyId === cid);
  const jobIds = new Set(jobs.map((j) => j.id));
  const apps = db().applications.filter((a) => jobIds.has(a.jobId));
  const week = Date.now() + 7 * 86_400_000;
  const monthAgo = Date.now() - 30 * 86_400_000;
  const attention: EmployerSummary["attention"] = [];
  jobs.filter((j) => j.status === "active" && j.newApplicantsCount > 0)
    .forEach((j) => attention.push({ id: `new-${j.id}`, text: `${j.newApplicantsCount} new applicants – ${j.title}`, link: `/employer/jobs/${j.id}`, action: "Review" }));
  jobs.filter((j) => j.status === "active" && j.deadline && new Date(j.deadline).getTime() < Date.now() + 3 * 86_400_000)
    .forEach((j) => attention.push({ id: `dl-${j.id}`, text: `"${j.title}" closes soon`, link: `/employer/jobs/${j.id}/edit`, action: "Extend" }));
  jobs.filter((j) => j.status === "draft")
    .forEach((j) => attention.push({ id: `dr-${j.id}`, text: `Draft not published – ${j.title}`, link: `/employer/jobs/${j.id}/edit`, action: "Finish" }));
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { day: d.toLocaleDateString("en-IN", { weekday: "short" }), count: apps.filter((a) => a.appliedAt.slice(0, 10) === key).length };
  });
  return {
    openJobs: jobs.filter((j) => j.status === "active").length,
    newApplicants: jobs.reduce((s, j) => s + (j.status === "active" ? j.newApplicantsCount : 0), 0),
    interviewsThisWeek: apps.filter((a) => a.stage === "interview" && a.interview && new Date(a.interview.at).getTime() < week).length,
    hiredThisMonth: apps.filter((a) => a.stage === "hired" && new Date(a.updatedAt).getTime() > monthAgo).length,
    attention,
    applicantsPerDay: days,
    funnel: [
      { stage: "Applied", count: apps.length },
      { stage: "Shortlisted", count: apps.filter((a) => ["shortlisted", "interview", "offer", "hired"].includes(a.stage)).length },
      { stage: "Interview", count: apps.filter((a) => ["interview", "offer", "hired"].includes(a.stage)).length },
      { stage: "Hired", count: apps.filter((a) => a.stage === "hired").length },
    ],
  };
});

route("GET", "/employer/jobs", (req) => {
  const u = need(req, "employer");
  const cid = myCompanyId(u);
  return db().jobs
    .filter((j) => j.companyId === cid && (!req.query.status || j.status === req.query.status))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
});

route("GET", "/employer/jobs/:id", (req) => ownJob(need(req, "employer"), req.params.id!));

function validateJob(body: any) {
  if (!body?.title?.trim()) throw new HttpError(422, "Job title is required.", "VALIDATION");
  if (body.payMin && body.payMax && Number(body.payMin) > Number(body.payMax)) throw new HttpError(422, "Minimum pay must be less than maximum.", "VALIDATION");
  if (body.status === "active" && !body.payMin && !body.payMax) throw new HttpError(422, "Add a pay range before publishing.", "VALIDATION");
  if (body.allowCalls && body.hrPhone && !/^[6-9]\d{9}$/.test(body.hrPhone)) throw new HttpError(422, "Enter a valid 10-digit HR number.", "VALIDATION");
}

route("POST", "/employer/jobs", (req) => {
  const u = need(req, "employer");
  const company = db().companies.find((c) => c.id === myCompanyId(u))!;
  validateJob(req.body);
  if (req.body.status === "active" && company.verification !== "approved")
    throw new HttpError(403, "You can publish jobs after your company is verified. Saved as draft instead?", "NOT_VERIFIED");
  const job: Job = {
    ...req.body, id: newId("j"), companyId: company.id, companyName: company.name,
    companyVerified: company.verification === "approved", postedAt: now(), applicantsCount: 0, newApplicantsCount: 0,
  };
  db().jobs.push(job);
  saveDb();
  return job;
});

route("PATCH", "/employer/jobs/:id", (req) => {
  const u = need(req, "employer");
  const j = ownJob(u, req.params.id!);
  const company = db().companies.find((c) => c.id === j.companyId)!;
  const next = { ...j, ...req.body };
  validateJob(next);
  if (next.status === "active" && j.status !== "active" && company.verification !== "approved")
    throw new HttpError(403, "You can publish jobs after your company is verified.", "NOT_VERIFIED");
  Object.assign(j, req.body);
  if (req.body.status === "active" && !req.body.postedAt && j.applicantsCount === 0) j.postedAt = now();
  saveDb();
  return j;
});

route("DELETE", "/employer/jobs/:id", (req) => {
  const u = need(req, "employer");
  const j = ownJob(u, req.params.id!);
  if (db().applications.some((a) => a.jobId === j.id)) throw new HttpError(409, "This job has applicants, so it can't be deleted. Close it instead.", "HAS_APPLICANTS");
  db().jobs = db().jobs.filter((x) => x.id !== j.id);
  saveDb();
  return { ok: true };
});

const toCandidate = (a: Application): Candidate => ({
  ...a,
  worker: workerOf(a.workerId),
  jobTitle: db().jobs.find((j) => j.id === a.jobId)?.title ?? "",
  documents: db().documents.filter((d) => d.ownerId === a.workerId).sort((x, y) => Number(y.id === a.documentId) - Number(x.id === a.documentId)),
});

route("GET", "/employer/candidates", (req) => {
  const u = need(req, "employer");
  const jobIds = new Set(db().jobs.filter((j) => j.companyId === myCompanyId(u)).map((j) => j.id));
  const text = req.query.q?.toLowerCase().trim();
  return db().applications
    .filter((a) => jobIds.has(a.jobId) && (!req.query.stage || a.stage === req.query.stage) && (!req.query.jobId || a.jobId === req.query.jobId))
    .map(toCandidate)
    .filter((c) => !text || `${c.worker.name} ${c.worker.location?.city ?? ""} ${c.worker.skills.join(" ")} ${c.worker.licences.join(" ")} ${c.jobTitle}`.toLowerCase().includes(text))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

route("GET", "/employer/jobs/:id/candidates", (req) => {
  const u = need(req, "employer");
  const j = ownJob(u, req.params.id!);
  // opening the pipeline marks applicants as seen
  j.newApplicantsCount = 0;
  saveDb();
  return db().applications.filter((a) => a.jobId === j.id).map(toCandidate).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
});

route("PATCH", "/employer/applications/:id", (req) => {
  const u = need(req, "employer");
  const a = db().applications.find((x) => x.id === req.params.id);
  if (!a) throw new HttpError(404, "Candidate not found.", "NOT_FOUND");
  const j = ownJob(u, a.jobId);
  if (a.stage === "withdrawn") throw new HttpError(409, "This candidate withdrew their application.", "WITHDRAWN");
  const stage = req.body?.stage as ApplicationStage | undefined;
  if (stage === "interview") {
    const at = req.body?.interview?.at;
    if (!at || new Date(at) < new Date()) throw new HttpError(422, "Choose an interview time in the future.", "VALIDATION");
    const rescheduled = a.stage === "interview";
    a.interview = { at, place: req.body.interview.place || j.location.city };
    if (rescheduled) notify(a.workerId, "Interview time changed", `${j.companyName} moved your ${j.title} interview. Please check the new time.`, `/worker/applications/${a.id}`);
  }
  if (stage && stage !== a.stage) {
    a.stage = stage;
    a.updatedAt = now();
    a.timeline.push({ stage, at: a.updatedAt, note: req.body?.note });
    if (stage === "rejected") a.rejectionNote = req.body?.note;
    const msg: Partial<Record<ApplicationStage, string>> = {
      shortlisted: `You were shortlisted for ${j.title}.`,
      interview: `${j.companyName} invited you for an interview for ${j.title}.`,
      offer: `${j.companyName} sent you an offer for ${j.title}! 🎉`,
      hired: `You are hired for ${j.title}. Congratulations!`,
      rejected: req.body?.notify === false ? undefined : `${j.companyName} did not select you this time for ${j.title}.`,
    };
    if (msg[stage]) notify(a.workerId, "Application update", msg[stage]!, `/worker/applications/${a.id}`);
  }
  saveDb();
  return toCandidate(a);
});

route("GET", "/employer/company", (req) => db().companies.find((c) => c.id === myCompanyId(need(req, "employer")))!);

route("PATCH", "/employer/company", (req) => {
  const u = need(req, "employer");
  const c = db().companies.find((x) => x.id === myCompanyId(u))!;
  const { id: _id, verification: _v, status: _s, ...changes } = req.body ?? {};
  Object.assign(c, changes);
  if (c.verification === "rejected" && req.body?.resubmit) {
    c.verification = "pending";
    c.rejectionReason = undefined;
  }
  db().jobs.forEach((j) => j.companyId === c.id && (j.companyName = c.name));
  saveDb();
  return c;
});

/* ---------------- admin ---------------- */

route("GET", "/admin/summary", (req): AdminSummary => {
  need(req, "admin");
  const d = db();
  const pending = d.companies.filter((c) => c.verification === "pending").length;
  const weeks = [...Array(6)].map((_, i) => {
    const end = Date.now() - (5 - i) * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const inRange = (iso: string) => { const t = new Date(iso).getTime(); return t > start && t <= end; };
    return {
      week: new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      workers: d.users.filter((u) => u.role === "worker" && inRange(u.createdAt)).length + [3, 5, 4, 7, 6, 0][i]!,
      companies: d.users.filter((u) => u.role === "employer" && inRange(u.createdAt)).length + [1, 0, 2, 1, 1, 0][i]!,
    };
  });
  const attention: AdminSummary["attention"] = [];
  if (pending) attention.push({ id: "pc", text: `${pending} ${pending === 1 ? "company is" : "companies are"} waiting for approval`, link: "/admin/verifications" });
  const openReports = d.reports.filter((r) => r.status === "open").length;
  const openTickets = d.tickets.filter((t) => t.status === "open").length;
  if (openReports) attention.push({ id: "rp", text: `${openReports} job ${openReports === 1 ? "report needs" : "reports need"} a decision`, link: "/admin/reports" });
  if (openTickets) attention.push({ id: "tk", text: `${openTickets} help ${openTickets === 1 ? "request is" : "requests are"} waiting`, link: "/admin/reports?tab=help" });
  const unpaid = d.jobs.filter((j) => j.status === "active" && !j.payMin && !j.payMax).length;
  if (unpaid) attention.push({ id: "np", text: `${unpaid} active ${unpaid === 1 ? "job has" : "jobs have"} no pay shown`, link: "/admin/jobs" });
  return {
    workers: d.users.filter((u) => u.role === "worker").length,
    companies: d.companies.length,
    activeJobs: d.jobs.filter((j) => j.status === "active").length,
    pendingVerifications: pending,
    openReports,
    openTickets,
    attention,
    signupsPerWeek: weeks,
  };
});

route("GET", "/admin/verifications", (req): VerificationItem[] => {
  need(req, "admin");
  const status = req.query.status ?? "pending";
  return db().companies.filter((c) => c.verification === status).map((c) => {
    const hr = db().users.find((u) => u.companyId === c.id);
    return {
      id: c.id, kind: "company", title: c.name, subtitle: `${SECTOR_LABEL[c.sector]} · ${c.location.city || "City not set"}`,
      submittedAt: c.createdAt, status: c.verification,
      details: {
        "GST number": c.gstNumber ?? "Not given", "Company size": c.size, Website: c.website ?? "—",
        "HR contact": hr ? `${c.hrName ?? hr.name}${c.hrDesignation ? ` (${c.hrDesignation})` : ""} · ${hr.email}` : "—",
        "Plants / sites": c.sites?.length ? c.sites.join(", ") : "—", About: c.about ?? "—",
      },
      documents: [],
    };
  });
});

route("POST", "/admin/verifications/:kind/:id", (req) => {
  const admin = need(req, "admin");
  const { decision, reason } = req.body ?? {};
  if (decision === "reject" && !reason?.trim()) throw new HttpError(422, "Please give a reason for rejecting.", "VALIDATION");
  const status = decision === "approve" ? "approved" : "rejected";
  const d = db();
  const c = d.companies.find((x) => x.id === req.params.id);
  if (!c) throw new HttpError(404, "Not found.");
  if (c.verification !== "pending") throw new HttpError(409, "This was already reviewed by another admin.", "ALREADY_DONE");
  c.verification = status;
  c.rejectionReason = status === "rejected" ? reason : undefined;
  if (status === "approved") c.status = "active";
  d.jobs.forEach((j) => j.companyId === c.id && (j.companyVerified = status === "approved"));
  const hr = d.users.find((u) => u.companyId === c.id);
  if (hr) {
    if (status === "approved") hr.status = "active";
    notify(hr.id, status === "approved" ? "Company verified ✓" : "Verification not approved", status === "approved" ? "You can now publish jobs." : `Reason: ${reason}`, "/employer/company");
  }
  audit(admin, status === "approved" ? "Approved company" : "Rejected company", c.name);
  saveDb();
  return { ok: true };
});

route("GET", "/admin/users", (req): AdminUserRow[] => {
  need(req, "admin");
  const d = db();
  const role = req.query.role ?? "worker";
  const text = req.query.q?.toLowerCase().trim();
  let rows: AdminUserRow[] = role === "worker"
    ? d.users.filter((u) => u.role === "worker").map((u) => {
        const w = workerOf(u.id);
        return { id: u.id, role: "worker", name: u.name, contact: `+91 ${u.phone}`, city: w?.location?.city ?? "—", status: u.status, joinedAt: u.createdAt };
      })
    : d.users.filter((u) => u.role === "employer").map((u) => {
        const c = d.companies.find((x) => x.id === u.companyId);
        return { id: u.id, role: "employer", name: c?.name ?? u.name, contact: u.email ?? "—", city: c?.location.city || "—", status: c?.status ?? u.status, verification: c?.verification ?? "pending", joinedAt: u.createdAt };
      });
  if (text) rows = rows.filter((r) => `${r.name} ${r.contact} ${r.city}`.toLowerCase().includes(text));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  return rows.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
});

route("PATCH", "/admin/users/:id", (req) => {
  const admin = need(req, "admin");
  if (req.params.id === admin.id) throw new HttpError(400, "You can't change your own account here.", "SELF");
  const d = db();
  const u = d.users.find((x) => x.id === req.params.id);
  if (!u) throw new HttpError(404, "User not found.");
  const status = req.body?.status as User["status"];
  u.status = status;
  if (u.companyId) {
    const c = d.companies.find((x) => x.id === u.companyId);
    if (c) c.status = status;
  }
  audit(admin, status === "blocked" ? "Blocked user" : "Unblocked user", u.name);
  saveDb();
  return { ok: true };
});

route("GET", "/admin/user-impact/:id", (req) => {
  need(req, "admin");
  const d = db();
  const u = d.users.find((x) => x.id === req.params.id);
  if (!u?.companyId) return { activeJobs: 0, applicants: 0 };
  const jobs = d.jobs.filter((j) => j.companyId === u.companyId && j.status === "active");
  const ids = new Set(jobs.map((j) => j.id));
  return { activeJobs: jobs.length, applicants: d.applications.filter((a) => ids.has(a.jobId)).length };
});

route("GET", "/admin/jobs", (req): AdminJobRow[] => {
  need(req, "admin");
  const text = req.query.q?.toLowerCase().trim();
  return db().jobs
    .filter((j) => j.status !== "draft")
    .filter((j) => !req.query.status || j.status === req.query.status)
    .filter((j) => !text || `${j.title} ${j.companyName} ${j.location.city}`.toLowerCase().includes(text))
    .map((j) => ({ ...j, companyStatus: db().companies.find((c) => c.id === j.companyId)?.status ?? "active" }))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
});

route("POST", "/admin/jobs/:id/remove", (req) => {
  const admin = need(req, "admin");
  if (!req.body?.reason?.trim()) throw new HttpError(422, "Please give a reason for removing this job.", "VALIDATION");
  const j = findJob(req.params.id!);
  j.status = "closed";
  j.removedByAdmin = true;
  const hr = db().users.find((u) => u.companyId === j.companyId);
  if (hr) notify(hr.id, "Job removed by IndustriaLink", `"${j.title}" was removed. Reason: ${req.body.reason}`, "/employer/jobs?tab=closed");
  audit(admin, "Removed job", `${j.title} (${j.companyName})`);
  saveDb();
  return { ok: true };
});

route("GET", "/admin/audit", (req) => {
  need(req, "admin");
  return db().audit.slice(0, 100);
});


/* =================================================================
   Added for the gap review (reports, replies, password, settings,
   messages, find workers, analytics, platform settings).
   ================================================================= */

const settingsOf = (userId: string): UserSettings => ({ ...DEFAULT_SETTINGS, ...db().settings[userId] });
const hrOf = (companyId: string) => db().users.find((x) => x.companyId === companyId && x.role === "employer");
const OPEN_STAGES: ApplicationStage[] = ["shortlisted", "interview", "offer", "hired"];

/* ---------- reports (worker -> admin) ---------- */

route("POST", "/jobs/:id/report", (req) => {
  const u = need(req, "worker");
  const j = findJob(req.params.id!);
  const reasons = ["asks_money", "fake", "wrong_details", "unsafe", "other"];
  if (!reasons.includes(req.body?.reason)) throw new HttpError(422, "Choose a reason.", "VALIDATION");
  if (req.body.reason === "other" && !req.body.details?.trim()) throw new HttpError(422, "Tell us what is wrong.", "VALIDATION");
  if (db().reports.some((r) => r.jobId === j.id && r.reporterName === u.name && r.status === "open"))
    throw new HttpError(409, "You already reported this job. Our team is checking it.", "ALREADY_REPORTED");
  const r: JobReport = {
    id: newId("r"), jobId: j.id, jobTitle: j.title, companyName: j.companyName, reporterName: u.name,
    reason: req.body.reason, details: req.body.details?.trim() || undefined, at: now(), status: "open",
  };
  db().reports.unshift(r);
  db().users.filter((x) => x.role === "admin").forEach((a) => notify(a.id, "Job reported", `${j.title} (${j.companyName}) was reported.`, "/admin/reports"));
  saveDb();
  return { ok: true };
});

route("GET", "/admin/reports", (req) => {
  need(req, "admin");
  const status = req.query.status ?? "open";
  return db().reports
    .filter((r) => status === "all" || r.status === status)
    .map((r) => ({ ...r, jobStatus: db().jobs.find((j) => j.id === r.jobId)?.status ?? "closed", reportsForJob: db().reports.filter((x) => x.jobId === r.jobId).length }));
});

route("POST", "/admin/reports/:id", (req) => {
  const admin = need(req, "admin");
  const r = db().reports.find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Report not found.");
  if (r.status !== "open") throw new HttpError(409, "This report was already handled.", "ALREADY_DONE");
  const action = req.body?.action as "dismiss" | "remove_job";
  if (action === "remove_job") {
    const reason = req.body?.note?.trim() || "Reported by workers and checked by our team";
    const j = findJob(r.jobId);
    j.status = "closed";
    j.removedByAdmin = true;
    const hr = hrOf(j.companyId);
    if (hr) notify(hr.id, "Job removed by IndustriaLink", `"${j.title}" was removed. Reason: ${reason}`, "/employer/jobs?tab=closed");
    db().reports.forEach((x) => { if (x.jobId === r.jobId && x.status === "open") { x.status = "job_removed"; x.resolvedAt = now(); x.resolvedBy = admin.name; } });
    audit(admin, "Removed reported job", `${j.title} (${j.companyName})`);
  } else {
    r.status = "dismissed"; r.resolvedAt = now(); r.resolvedBy = admin.name;
    audit(admin, "Dismissed report", `${r.jobTitle} (${r.companyName})`);
  }
  saveDb();
  return { ok: true };
});

/* ---------- worker replies to interview / offer ---------- */

const myApp = (u: User, id: string) => {
  const a = db().applications.find((x) => x.id === id && x.workerId === u.id);
  if (!a) throw new HttpError(404, "Application not found.", "NOT_FOUND");
  return a;
};

route("POST", "/worker/applications/:id/interview-response", (req) => {
  const u = need(req, "worker");
  const a = myApp(u, req.params.id!);
  if (a.stage !== "interview" || !a.interview) throw new HttpError(409, "There is no interview to reply to.", "NO_INTERVIEW");
  const response = req.body?.response;
  if (response !== "attending" && response !== "cant_attend") throw new HttpError(422, "Choose a reply.", "VALIDATION");
  a.interview.response = response;
  a.interview.responseNote = req.body?.note?.trim() || undefined;
  a.interview.respondedAt = now();
  a.updatedAt = now();
  const j = findJob(a.jobId);
  const hr = hrOf(j.companyId);
  if (hr) notify(hr.id, response === "attending" ? "Interview confirmed" : "Candidate can't attend",
    response === "attending" ? `${u.name} will attend the interview for ${j.title}.` : `${u.name} can't attend the interview for ${j.title}${a.interview.responseNote ? `: "${a.interview.responseNote}"` : "."} Please pick a new time.`,
    `/employer/jobs/${j.id}`);
  saveDb();
  return withJob(a);
});

route("POST", "/worker/applications/:id/offer-response", (req) => {
  const u = need(req, "worker");
  const a = myApp(u, req.params.id!);
  if (a.stage !== "offer") throw new HttpError(409, "There is no offer to reply to.", "NO_OFFER");
  const response = req.body?.response;
  if (response !== "accepted" && response !== "declined") throw new HttpError(422, "Choose a reply.", "VALIDATION");
  a.offerResponse = response;
  a.updatedAt = now();
  if (response === "declined") {
    a.stage = "withdrawn";
    a.timeline.push({ stage: "withdrawn", at: a.updatedAt, note: req.body?.note?.trim() ? `Declined the offer: ${req.body.note.trim()}` : "Declined the offer" });
  } else {
    a.timeline.push({ stage: "offer", at: a.updatedAt, note: "Accepted the offer" });
  }
  const j = findJob(a.jobId);
  const hr = hrOf(j.companyId);
  if (hr) notify(hr.id, response === "accepted" ? "Offer accepted 🎉" : "Offer declined",
    response === "accepted" ? `${u.name} accepted your offer for ${j.title}. Mark them hired once they join.` : `${u.name} declined your offer for ${j.title}.`, `/employer/jobs/${j.id}`);
  saveDb();
  return withJob(a);
});

/* ---------- password ---------- */

route("POST", "/auth/password/forgot", ({ body }) => {
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(422, "Enter a valid email address.", "VALIDATION");
  const u = db().users.find((x) => x.email?.toLowerCase() === email);
  // Same answer whether or not the email exists, so nobody can probe for accounts.
  if (!u) return { ok: true };
  const tokenValue = newId("reset");
  db().passwordResets.push({ token: tokenValue, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  saveDb();
  // Demo only: the real API emails this link instead of returning it.
  return { ok: true, demoResetLink: `/reset-password?token=${tokenValue}` };
});

route("POST", "/auth/password/reset", ({ body }) => {
  const r = db().passwordResets.find((x) => x.token === body?.token);
  if (!r || new Date(r.expiresAt) < new Date()) throw new HttpError(410, "This reset link has expired. Ask for a new one.", "EXPIRED");
  if (String(body?.password ?? "").length < 8) throw new HttpError(422, "Use at least 8 characters.", "VALIDATION");
  const u = db().users.find((x) => x.id === r.userId)!;
  u.password = body.password;
  db().passwordResets = db().passwordResets.filter((x) => x.userId !== u.id);
  saveDb();
  return { ok: true, role: u.role };
});

route("POST", "/auth/password/change", (req) => {
  const u = need(req);
  const stored = db().users.find((x) => x.id === u.id)!;
  if (!stored.email) throw new HttpError(400, "Workers log in with a mobile code, so there is no password.", "NO_PASSWORD");
  if (stored.password !== req.body?.current) throw new HttpError(422, "Current password is wrong.", "WRONG_PASSWORD");
  if (String(req.body?.next ?? "").length < 8) throw new HttpError(422, "Use at least 8 characters.", "VALIDATION");
  stored.password = req.body.next;
  saveDb();
  return { ok: true };
});

/* ---------- public job page (no login) ---------- */

route("GET", "/public/jobs/:id", (req) => {
  const j = findJob(req.params.id!);
  const company = db().companies.find((c) => c.id === j.companyId);
  if (j.status === "draft" || company?.status === "blocked") throw new HttpError(404, "This job was removed or doesn't exist.", "NOT_FOUND");
  const { hrPhone: _private, ...publicJob } = j;
  return publicJob;
});

/* ---------- settings & account ---------- */

route("GET", "/me/settings", (req) => settingsOf(need(req).id));

route("PATCH", "/me/settings", (req) => {
  const u = need(req);
  const allowed: (keyof UserSettings)[] = ["language", "jobAlerts", "smsAlerts", "whatsappAlerts", "visibleToEmployers"];
  const next = { ...settingsOf(u.id) };
  for (const k of allowed) if (k in (req.body ?? {})) (next as any)[k] = req.body[k];
  db().settings[u.id] = next;
  saveDb();
  return next;
});

route("POST", "/me/delete", (req) => {
  const u = need(req);
  if (u.role === "admin") throw new HttpError(400, "Admin accounts are removed by the IndustriaLink team.", "ADMIN");
  if (req.body?.confirm !== "DELETE") throw new HttpError(422, 'Type DELETE to confirm.', "VALIDATION");
  const d = db();
  if (u.role === "worker") {
    d.applications.forEach((a) => {
      if (a.workerId === u.id && !["hired", "rejected", "withdrawn"].includes(a.stage)) { a.stage = "withdrawn"; a.updatedAt = now(); a.timeline.push({ stage: "withdrawn", at: a.updatedAt, note: "Account deleted" }); }
    });
    // Keep an empty shell so old applications still render for HR, but remove all personal data.
    const w = d.workers.find((x) => x.userId === u.id);
    if (w) Object.assign(w, { name: "Deleted user", phone: "", email: undefined, dob: undefined, address: undefined, pincode: undefined, about: undefined, photoUrl: undefined, skills: [], licences: [], qualifications: [], languages: [] });
    d.documents = d.documents.filter((x) => x.ownerId !== u.id);
    delete d.saved[u.id];
  } else if (u.companyId) {
    const c = d.companies.find((x) => x.id === u.companyId);
    if (c) c.status = "blocked";
    d.jobs.forEach((j) => j.companyId === u.companyId && j.status === "active" && (j.status = "closed"));
  }
  d.users = d.users.filter((x) => x.id !== u.id);
  d.notifications = d.notifications.filter((n) => n.userId !== u.id);
  delete d.settings[u.id];
  audit(u, "Deleted own account", u.name);
  saveDb();
  return { ok: true };
});

/* ---------- companies list for workers ---------- */

route("GET", "/companies", (req) => {
  need(req, "worker");
  const text = req.query.q?.toLowerCase().trim();
  return db().companies
    .filter((c) => c.verification === "approved" && c.status === "active")
    .filter((c) => !text || `${c.name} ${c.location.city} ${SECTOR_LABEL[c.sector]}`.toLowerCase().includes(text))
    .filter((c) => !req.query.sector || c.sector === req.query.sector)
    .map((c) => {
      const { gstNumber: _gst, ...company } = c;
      return { company: company as Company, openJobs: db().jobs.filter((j) => j.companyId === c.id && j.status === "active").length };
    })
    .sort((a, b) => b.openJobs - a.openJobs);
});

/* ---------- help / support ---------- */

route("POST", "/support", (req) => {
  const topic = String(req.body?.topic ?? "").trim();
  const message = String(req.body?.message ?? "").trim();
  if (!topic || message.length < 10) throw new HttpError(422, "Choose a topic and write at least a short message.", "VALIDATION");
  const u = req.user;
  const contact = u ? (u.phone ? `+91 ${u.phone}` : u.email ?? "") : String(req.body?.contact ?? "").trim();
  if (!contact) throw new HttpError(422, "Give a phone number or email so we can reply.", "VALIDATION");
  db().tickets.unshift({ id: newId("t"), userId: u?.id, name: u?.name ?? (String(req.body?.name ?? "").trim() || "Guest"), contact, role: u?.role ?? "guest", topic, message, at: now(), status: "open" });
  saveDb();
  return { ok: true };
});

route("GET", "/admin/support", (req) => {
  need(req, "admin");
  const status = req.query.status ?? "open";
  return db().tickets.filter((t) => status === "all" || t.status === status);
});

route("POST", "/admin/support/:id/close", (req) => {
  const admin = need(req, "admin");
  const t = db().tickets.find((x) => x.id === req.params.id);
  if (!t) throw new HttpError(404, "Request not found.");
  t.status = "closed";
  if (t.userId) notify(t.userId, "Your help request was answered", `About "${t.topic}". Our team has handled it.`);
  audit(admin, "Closed help request", `${t.topic} (${t.name})`);
  saveDb();
  return { ok: true };
});

/* ---------- messages (after shortlisting) ---------- */

function threadAccess(u: User, applicationId: string) {
  const a = db().applications.find((x) => x.id === applicationId);
  if (!a) throw new HttpError(404, "Conversation not found.", "NOT_FOUND");
  const j = db().jobs.find((x) => x.id === a.jobId);
  if (!j) throw new HttpError(404, "Conversation not found.", "NOT_FOUND");
  if (u.role === "worker" && a.workerId !== u.id) throw new HttpError(404, "Conversation not found.", "NOT_FOUND");
  if (u.role === "employer" && j.companyId !== u.companyId) throw new HttpError(404, "Conversation not found.", "NOT_FOUND");
  if (u.role === "admin") throw new HttpError(403, "Admins can't read private messages.", "FORBIDDEN");
  return { a, j };
}

function toThread(u: User, a: Application, j: Job): MessageThread {
  const msgs = db().messages.filter((m) => m.applicationId === a.id);
  const last = msgs[msgs.length - 1];
  const lastRead = db().reads[`${u.id}:${a.id}`] ?? "";
  const worker = workerOf(a.workerId);
  const hr = hrOf(j.companyId);
  return {
    applicationId: a.id, jobTitle: j.title, companyName: j.companyName, workerName: worker?.name ?? "Worker",
    otherName: u.role === "worker" ? `${hr?.name ?? "HR"} · ${j.companyName}` : worker?.name ?? "Worker",
    stage: a.stage, lastMessage: last?.text, lastAt: last?.at,
    unread: msgs.filter((m) => m.fromUserId !== u.id && m.at > lastRead).length,
    canSend: db().platform.messagingEnabled && OPEN_STAGES.includes(a.stage),
  };
}

route("GET", "/messages", (req) => {
  const u = need(req);
  const d = db();
  const jobs = new Map(d.jobs.map((j) => [j.id, j]));
  return d.applications
    .filter((a) => {
      const j = jobs.get(a.jobId);
      if (!j) return false;
      const mine = u.role === "worker" ? a.workerId === u.id : u.role === "employer" && j.companyId === u.companyId;
      return mine && (OPEN_STAGES.includes(a.stage) || d.messages.some((m) => m.applicationId === a.id));
    })
    .map((a) => toThread(u, a, jobs.get(a.jobId)!))
    .sort((x, y) => (y.lastAt ?? "").localeCompare(x.lastAt ?? ""));
});

route("GET", "/messages/:applicationId", (req) => {
  const u = need(req);
  const { a, j } = threadAccess(u, req.params.applicationId!);
  db().reads[`${u.id}:${a.id}`] = now();
  saveDb();
  return { thread: toThread(u, a, j), messages: db().messages.filter((m) => m.applicationId === a.id) };
});

route("POST", "/messages/:applicationId", (req) => {
  const u = need(req);
  const { a, j } = threadAccess(u, req.params.applicationId!);
  if (!db().platform.messagingEnabled) throw new HttpError(403, "Messaging is turned off right now.", "DISABLED");
  if (!OPEN_STAGES.includes(a.stage)) throw new HttpError(403, "You can message once the worker is shortlisted, and until the application closes.", "NOT_ALLOWED");
  const text = String(req.body?.text ?? "").trim();
  if (!text) throw new HttpError(422, "Write a message first.", "VALIDATION");
  if (text.length > 1000) throw new HttpError(422, "Keep messages under 1000 characters.", "VALIDATION");
  const m: Message = { id: newId("m"), applicationId: a.id, fromUserId: u.id, fromRole: u.role as "worker" | "employer", text, at: now() };
  db().messages.push(m);
  db().reads[`${u.id}:${a.id}`] = m.at;
  const to = u.role === "worker" ? hrOf(j.companyId)?.id : a.workerId;
  if (to) notify(to, `Message from ${u.name}`, text.length > 80 ? `${text.slice(0, 80)}…` : text, u.role === "worker" ? `/employer/messages?c=${a.id}` : `/worker/messages?c=${a.id}`);
  saveDb();
  return m;
});

/* ---------- employer: find workers ---------- */

route("GET", "/employer/talent", (req): TalentProfile[] => {
  const u = need(req, "employer");
  const d = db();
  if (!d.platform.talentSearchEnabled) throw new HttpError(403, "Find workers is turned off right now.", "DISABLED");
  const cid = myCompanyId(u);
  const company = d.companies.find((c) => c.id === cid)!;
  if (company.verification !== "approved") throw new HttpError(403, "You can search workers after your company is verified.", "NOT_VERIFIED");
  const myJobs = new Set(d.jobs.filter((j) => j.companyId === cid).map((j) => j.id));
  const q = req.query;
  const text = q.q?.toLowerCase().trim();
  return d.workers
    .filter((w) => { const usr = d.users.find((x) => x.id === w.userId); return usr?.status === "active" && usr.onboarded && settingsOf(w.userId).visibleToEmployers; })
    .filter((w) => !q.trade || w.trade === q.trade)
    .filter((w) => !q.experience || w.experience === q.experience)
    .filter((w) => !q.city || `${w.location?.city ?? ""} ${w.location?.state ?? ""}`.toLowerCase().includes(q.city.toLowerCase()) || (q.relocate === "true" && w.willingToRelocate))
    .filter((w) => !text || `${w.name} ${w.skills.join(" ")} ${w.licences.join(" ")} ${w.qualifications.join(" ")} ${w.trade ? TRADE_LABEL[w.trade] : ""}`.toLowerCase().includes(text))
    .map((w) => ({
      userId: w.userId, name: w.name, trade: w.trade, experience: w.experience, qualifications: w.qualifications, licences: w.licences,
      skills: w.skills, location: w.location, willingToRelocate: w.willingToRelocate, expectedPay: w.expectedPay, availability: w.availability,
      languages: w.languages, safetyTrainingHours: w.safetyTrainingHours, photoUrl: w.photoUrl,
      invitedTo: d.invites.filter((i) => i.companyId === cid && i.workerId === w.userId).map((i) => i.jobId),
      appliedTo: d.applications.filter((a) => a.workerId === w.userId && myJobs.has(a.jobId)).map((a) => a.jobId),
    }));
});

route("POST", "/employer/talent/:workerId/invite", (req) => {
  const u = need(req, "employer");
  const d = db();
  const j = ownJob(u, req.body?.jobId);
  if (j.status !== "active") throw new HttpError(409, "Only open jobs can be shared.", "JOB_CLOSED");
  const w = d.workers.find((x) => x.userId === req.params.workerId);
  if (!w) throw new HttpError(404, "Worker not found.");
  if (d.applications.some((a) => a.workerId === w.userId && a.jobId === j.id)) throw new HttpError(409, `${w.name} already applied to this job.`, "ALREADY_APPLIED");
  if (d.invites.some((i) => i.workerId === w.userId && i.jobId === j.id)) throw new HttpError(409, `You already invited ${w.name} to this job.`, "ALREADY_INVITED");
  d.invites.push({ companyId: j.companyId, workerId: w.userId, jobId: j.id, at: now() });
  notify(w.userId, `${j.companyName} invited you to apply`, `${j.title} · ${j.location.city}. Have a look and apply if it suits you.`, `/worker/jobs/${j.id}`);
  saveDb();
  return { ok: true };
});

/* ---------- employer analytics ---------- */

route("GET", "/employer/analytics", (req): EmployerAnalytics => {
  const u = need(req, "employer");
  const d = db();
  const cid = myCompanyId(u);
  const jobs = d.jobs.filter((j) => j.companyId === cid && j.status !== "draft");
  const ids = new Set(jobs.map((j) => j.id));
  const apps = d.applications.filter((a) => ids.has(a.jobId));
  const hiredApps = apps.filter((a) => a.stage === "hired");
  const days = hiredApps.map((a) => {
    const h = a.timeline.find((t) => t.stage === "hired")?.at ?? a.updatedAt;
    return (new Date(h).getTime() - new Date(a.appliedAt).getTime()) / 86_400_000;
  });
  const active = jobs.filter((j) => j.status === "active");
  const openings = active.reduce((s, j) => s + j.openings, 0);
  const hiredActive = hiredApps.filter((a) => active.some((j) => j.id === a.jobId)).length;
  const byState = new Map<string, number>();
  apps.forEach((a) => { const st = workerOf(a.workerId)?.location?.state || "Not given"; byState.set(st, (byState.get(st) ?? 0) + 1); });
  const weeks = [...Array(8)].map((_, i) => {
    const end = Date.now() - (7 - i) * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    return {
      week: new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      count: apps.filter((a) => { const t = new Date(a.appliedAt).getTime(); return t > start && t <= end; }).length,
    };
  });
  const reached = (a: Application, s: ApplicationStage[]) => s.includes(a.stage) || a.timeline.some((t) => s.includes(t.stage as ApplicationStage));
  return {
    totalApplicants: apps.length,
    hired: hiredApps.length,
    fillRate: openings ? Math.round((hiredActive / openings) * 100) : 0,
    avgDaysToHire: days.length ? Math.round((days.reduce((s, x) => s + x, 0) / days.length) * 10) / 10 : null,
    resumeShare: apps.length ? Math.round((apps.filter((a) => a.sentWith === "document").length / apps.length) * 100) : 0,
    applicantsPerWeek: weeks,
    byState: [...byState.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
    byJob: jobs.map((j) => {
      const ja = apps.filter((a) => a.jobId === j.id);
      return {
        jobId: j.id, title: j.title, openings: j.openings, applied: ja.length,
        shortlisted: ja.filter((a) => reached(a, ["shortlisted", "interview", "offer", "hired"])).length,
        interview: ja.filter((a) => reached(a, ["interview", "offer", "hired"])).length,
        hired: ja.filter((a) => a.stage === "hired").length,
      };
    }).sort((a, b) => b.applied - a.applied),
  };
});

/* ---------- admin: platform settings ---------- */

route("GET", "/admin/settings", (req) => { need(req, "admin"); return db().platform; });

route("PATCH", "/admin/settings", (req) => {
  const admin = need(req, "admin");
  const p = db().platform;
  for (const k of ["autoApproveCompanies", "messagingEnabled", "talentSearchEnabled"] as const) {
    if (typeof req.body?.[k] === "boolean" && req.body[k] !== p[k]) {
      p[k] = req.body[k];
      audit(admin, `${p[k] ? "Turned on" : "Turned off"} setting`, { autoApproveCompanies: "Auto-approve companies", messagingEnabled: "Messaging", talentSearchEnabled: "Find workers" }[k]);
    }
  }
  saveDb();
  return p;
});
