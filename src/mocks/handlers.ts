/**
 * Mock API endpoints. Each route mirrors one endpoint of the real backend
 * (see API_CONTRACT.md). When the backend is ready, set VITE_USE_MOCKS=false
 * and nothing in the UI needs to change.
 */
import type {
  AdminJobRow, AdminSummary, AdminUserRow, Application, ApplicationStage, Candidate, CompanyForWorker, EmployerSummary, Job,
  JobForWorker, Paginated, User, VerificationItem, WorkerApplication, WorkerDocument, WorkerProfile, WorkerSummary,
} from "@/types";
import { SECTOR_LABEL, TRADE_LABEL } from "@/lib/labels";
import { getDb, newId, now, saveDb } from "./db";
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
    verification: "pending", status: "pending", createdAt: now(),
  });
  const user: User & { password?: string } = {
    id: newId("u"), role: "employer", name: body.name, email, password: body.password, status: "pending",
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

route("GET", "/jobs", (req): Paginated<JobForWorker> => {
  const u = need(req, "worker");
  const q = req.query;
  const blockedCompanies = new Set(db().companies.filter((c) => c.status === "blocked").map((c) => c.id));
  let list = db().jobs.filter((j) => j.status === "active" && !blockedCompanies.has(j.companyId));
  const text = q.q?.trim().toLowerCase();
  if (text) list = list.filter((j) => [j.title, j.companyName, TRADE_LABEL[j.trade], SECTOR_LABEL[j.sector]].join(" ").toLowerCase().includes(text));
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

  const home = workerOf(u.id).location?.city;
  const monthly = (j: Job) => ((j.payMax ?? j.payMin ?? 0) * (j.payPeriod === "day" ? 26 : 1));
  if (q.sort === "pay") list.sort((a, b) => monthly(b) - monthly(a));
  else if (q.sort === "nearest" && home) list.sort((a, b) => Number(b.location.city === home) - Number(a.location.city === home));
  else list.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  // jobs without pay go last (plan: rank "Salary not disclosed" lower)
  list.sort((a, b) => Number(!a.payMin && !a.payMax) - Number(!b.payMin && !b.payMax));

  const page = Math.max(1, Number(q.page ?? 1));
  const pageSize = 10;
  return {
    items: list.slice((page - 1) * pageSize, page * pageSize).map((j) => forWorker(j, u.id)),
    total: list.length, page, pageSize,
  };
});

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
    a.interview = { at, place: req.body.interview.place || j.location.city };
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
  const unpaid = d.jobs.filter((j) => j.status === "active" && !j.payMin && !j.payMax).length;
  if (unpaid) attention.push({ id: "np", text: `${unpaid} active ${unpaid === 1 ? "job has" : "jobs have"} no pay shown`, link: "/admin/jobs" });
  return {
    workers: d.users.filter((u) => u.role === "worker").length,
    companies: d.companies.length,
    activeJobs: d.jobs.filter((j) => j.status === "active").length,
    pendingVerifications: pending,
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
        "HR contact": hr ? `${hr.name} · ${hr.email}` : "—", About: c.about ?? "—",
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
