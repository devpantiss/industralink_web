# API contract (v1)

The endpoints the dashboard expects. The mock API in `src/mocks/handlers.ts` already implements all of them, so it doubles as a working reference.
The types (`User`, `Job`, …) are defined in `src/types/index.ts`.

## Conventions

- Base URL: `/api/v1`. JSON in, JSON out.
- Auth: `Authorization: Bearer <token>` (token comes from the login endpoints).
- Errors: HTTP status + body `{ "message": "Human-friendly text", "code": "MACHINE_CODE" }`.
  The UI shows `message` directly to the user, so write it in plain words.
- `401` on any call logs the user out. `403` + `code: "BLOCKED"` means the account is suspended.
- Dates are ISO strings (`2026-11-06T10:00:00.000Z`). Money is whole rupees.

## Auth

| Method | Path | Body | Returns | Notable errors |
|---|---|---|---|---|
| POST | `/auth/otp/request` | `{ phone }` | `{ sent, isNewUser }` | 400 `INVALID_PHONE` |
| POST | `/auth/otp/verify` | `{ phone, code, name? }` (name = sign up) | `AuthResponse` | 400 `WRONG_OTP`, 404 `NOT_FOUND` (no account), 409 `EXISTS` (sign-up with a known number), 403 `BLOCKED` |
| POST | `/auth/login` | `{ email, password }` | `AuthResponse` | 401 `INVALID_CREDENTIALS`, 403 `BLOCKED` |
| POST | `/auth/signup/employer` | `{ name, email, password, companyName }` | `AuthResponse` | 409 `EXISTS` |
| GET | `/auth/me` | | `User` | 401 |
| POST | `/auth/logout` | | `{ ok }` | |
| POST | `/auth/onboarding/complete` | | `User` | |

## Notifications (all roles)

| Method | Path | Returns |
|---|---|---|
| GET | `/notifications` | `AppNotification[]` (newest first, max 30) |
| POST | `/notifications/:id/read` | `{ ok }` |
| POST | `/notifications/read-all` | `{ ok }` |

## Worker (role = worker)

| Method | Path | Body / query | Returns | Notable errors |
|---|---|---|---|---|
| GET | `/worker/summary` | | `WorkerSummary` (incl. `missing[]` that drives the profile banner) | |
| GET | `/jobs` | query: `JobSearchParams` | `Paginated<JobForWorker>` (page size 10, only active jobs whose `deadline` hasn't passed, unpaid jobs last) | |
| GET | `/jobs/:id` | | `JobForWorker` (**never includes `hrPhone`**) | 404 `NOT_FOUND` |
| GET | `/companies/:id` | | `CompanyForWorker` (company **without `gstNumber` and `hrPhone`** + its open jobs) | 404 |
| POST / DELETE | `/jobs/:id/save` | | `{ saved }` | |
| GET | `/worker/saved` | | `JobForWorker[]` | |
| POST | `/jobs/:id/apply` | `{ sentWith: "profile" \| "document", documentId? }` | `Application` | 410 `JOB_CLOSED`, 409 `ALREADY_APPLIED`, 409 `WITHDRAWN` |
| GET | `/worker/applications` | | `WorkerApplication[]`. `contact` is set only when stage ≥ shortlisted **and** `job.allowCalls` | |
| GET | `/worker/applications/:id` | | `WorkerApplication` | 404 |
| POST | `/worker/applications/:id/withdraw` | | `WorkerApplication` | 409 `CLOSED` |
| GET / PATCH | `/worker/profile` | PATCH: `Partial<WorkerProfile>` (phone and verification can't be changed) | `WorkerProfile` | |
| GET | `/worker/documents` | | `WorkerDocument[]` (no review status: documents are not verified) | |
| POST | `/worker/documents` | `multipart/form-data`: `file`, `type` (DocType). PDF/JPG/PNG/WEBP, max 5 MB | `WorkerDocument` (with a `url` to the stored file) | 415 `BAD_TYPE`, 413 `TOO_BIG` |
| DELETE | `/worker/documents/:id` | | `{ ok }` | |
| POST | `/worker/documents/:id/default` | | `{ ok }` | |

## Employer (role = employer)

| Method | Path | Body / query | Returns | Notable errors |
|---|---|---|---|---|
| GET | `/employer/summary` | | `EmployerSummary` | |
| GET | `/employer/jobs` | query: `status?` | `Job[]` | |
| GET | `/employer/jobs/:id` | | `Job` | 404 |
| POST | `/employer/jobs` | `JobInput` | `Job` | 422 `VALIDATION`, 403 `NOT_VERIFIED` (publishing before company is approved) |
| PATCH | `/employer/jobs/:id` | `Partial<JobInput>` | `Job` | 422, 403 `NOT_VERIFIED` |
| DELETE | `/employer/jobs/:id` | | `{ ok }` | 409 `HAS_APPLICANTS` (close it instead) |
| GET | `/employer/jobs/:id/candidates` | | `Candidate[]` incl. the worker's `documents` (also resets the job's "new applicants" count) | |
| GET | `/employer/candidates` | query: `q?`, `stage?`, `jobId?` | `Candidate[]` across all the company's jobs | |
| PATCH | `/employer/applications/:id` | `{ stage, note?, notify?, interview?: { at, place, contactPerson?, bring? }, offer?: { pay, payPeriod, payType?, joiningDate, place, note? } }`. `offer` is required when `stage` is `offer`; sending it again while in `offer` updates the offer and clears the worker's reply | `Candidate` | 409 `WITHDRAWN`, 422 (interview time in the past, offer without pay / joining date / place) |
| POST | `/employer/applications/:id/view` | | `{ ok }` | Adds a `viewed` timeline event once ("Seen by employer" for the worker). Any stage change also adds it if missing |
| GET / PATCH | `/employer/company` | PATCH: `Partial<Company>` + `resubmit?: boolean` | `Company` | 422 (bad `hrPhone` / `pincode`). Changing `name` or `logoUrl` also updates the company's jobs |
| GET | `/employer/company/documents` | | `CompanyDocument[]` | Verification proof. Only the company and admins see these |
| POST | `/employer/company/documents` | `multipart/form-data`: `file`, `type` (`gst` \| `udyam` \| `cin` \| `other`). PDF/JPG/PNG/WEBP, max 5 MB | `CompanyDocument` | 415, 413 |
| DELETE | `/employer/company/documents/:id` | | `{ ok }` | 409 `LOCKED` once the company is approved |

Moving a candidate sends the worker a notification (rejection only if `notify` isn't `false`).

## Admin (role = admin)

| Method | Path | Body / query | Returns | Notable errors |
|---|---|---|---|---|
| GET | `/admin/summary` | | `AdminSummary` | |
| GET | `/admin/verifications` | query: `status?` (default pending) | `VerificationItem[]` (companies only). `documents` = the company's uploaded `CompanyDocument`s; `details` include HR mobile, address and "Hiring as" | |
| POST | `/admin/verifications/company/:id` | `{ decision: "approve" \| "reject", reason? }` | `{ ok }` | 422 (reject without reason), 409 `ALREADY_DONE` |
| GET | `/admin/jobs` | query: `q?`, `status?` | `AdminJobRow[]` | |
| POST | `/admin/jobs/:id/remove` | `{ reason }` | `{ ok }` (closes the job, tells the company) | 422 |
| GET | `/admin/users` | query: `role`, `q?`, `status?` | `AdminUserRow[]` | |
| PATCH | `/admin/users/:id` | `{ status }` | `{ ok }` | 400 `SELF` |
| GET | `/admin/user-impact/:id` | | `{ activeJobs, applicants }` (shown before blocking a company) | |
| GET | `/admin/audit` | | `AuditEntry[]` | |

Every admin decision is written to the audit log.

## Added after the gap review

Shapes are in `src/types/index.ts`. Mock versions are in `src/mocks/handlers.ts`.

### Public (no login)

| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| GET | `/public/jobs/:id` | | `Job` without `hrPhone` | The page a shared WhatsApp link opens. 404 for drafts or blocked companies. |
| POST | `/support` | `{ topic, message, name?, contact? }` | `{ ok }` | Help request. If logged in, contact comes from the account. |
| POST | `/auth/password/forgot` | `{ email }` | `{ ok }` | Same reply whether or not the email exists. The real API emails a link valid for 1 hour (the mock returns `demoResetLink`). |
| POST | `/auth/password/reset` | `{ token, password }` | `{ ok, role }` | 410 `EXPIRED`, 422 |

### Any logged-in user

| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| POST | `/auth/password/change` | `{ current, next }` | `{ ok }` | Employer/admin only. 422 `WRONG_PASSWORD` |
| GET / PATCH | `/me/settings` | `Partial<UserSettings>` | `UserSettings` | Language, alerts, "let companies find me" |
| POST | `/me/delete` | `{ confirm: "DELETE" }` | `{ ok }` | Worker: personal data erased, open applications withdrawn. Employer: company hidden, jobs closed. (DPDP Act) |
| GET | `/messages` | | `MessageThread[]` | One thread per application, from shortlisted onwards |
| GET | `/messages/:applicationId` | | `{ thread, messages: Message[] }` | Also marks the thread as read |
| POST | `/messages/:applicationId` | `{ text }` (max 1000) | `Message` | 403 `NOT_ALLOWED` before shortlisting or after closing, 403 `DISABLED` when admin turned messaging off. Admins can't read messages. |

### Worker

| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| POST | `/jobs/:id/report` | `{ reason, details? }` | `{ ok }` | reason: `asks_money \| fake \| wrong_details \| unsafe \| other`. 409 `ALREADY_REPORTED` |
| POST | `/worker/applications/:id/interview-response` | `{ response: "attending" \| "cant_attend", note? }` | `WorkerApplication` | Tells HR. Rescheduling clears the reply. |
| POST | `/worker/applications/:id/offer-response` | `{ response: "accepted" \| "declined", note? }` | `WorkerApplication` | Declining sets stage `withdrawn` |
| GET | `/companies` | query: `q?`, `sector?` | `{ company, openJobs }[]` | Approved companies only |

`WorkerProfile` gained `languages`, `safetyTrainingHours`, `employmentType` and `photoUrl`, all optional.

### Employer

| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| GET | `/employer/talent` | query: `q?`, `trade?`, `experience?`, `city?`, `relocate?` | `TalentProfile[]` | Only workers with `visibleToEmployers`. No phone, email or documents. 403 `NOT_VERIFIED` / `DISABLED` |
| POST | `/employer/talent/:workerId/invite` | `{ jobId }` | `{ ok }` | Notifies the worker. 409 if already applied or invited |
| GET | `/employer/analytics` | | `EmployerAnalytics` | |

`Company` gained `hrName`, `hrDesignation` and `sites`. Moving an interview that's already scheduled notifies the worker.

### Admin

| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| GET | `/admin/reports` | query: `status?` (open, dismissed, job_removed, all) | `JobReport[]` + `jobStatus`, `reportsForJob` | |
| POST | `/admin/reports/:id` | `{ action: "dismiss" \| "remove_job", note? }` | `{ ok }` | Removing closes the job and resolves all its open reports |
| GET | `/admin/support` | query: `status?` | `SupportTicket[]` | |
| POST | `/admin/support/:id/close` | | `{ ok }` | Notifies the user |
| GET / PATCH | `/admin/settings` | `Partial<PlatformSettings>` | `PlatformSettings` | Messaging, Find workers, auto-approve. Logged. |

`AdminSummary` gained `openReports` and `openTickets`.

## Added for the data gaps (Nov 2026)

**Privacy rule for every worker response:** `rejectionNote` and the `note` on a `rejected` timeline event are for HR only ("only you see this"). Strip them from `WorkerApplication` (list, detail, withdraw, interview / offer replies). Company `gstNumber` and `hrPhone` are never sent to workers.

New optional fields (all optional, so old data still works):

- `Company`: `logoUrl`, `hrPhone`, `address`, `pincode`, `hiringType` (`direct` \| `agency`).
- `Job`: `companyLogoUrl` (copied from the company, like `companyName`), `licences[]` (same list as worker licences), `payType` (`in_hand` \| `ctc`), `workHours`, `contractLength` (contract jobs), `address`, `pincode`. Publishing needs `location.state`.
- `WalkIn`: `endDate`, `endTime`, `contactPerson`, `bring`.
- `Interview`: `contactPerson`, `bring`.
- `Application.offer`: `{ pay, payPeriod, payType?, joiningDate, place, note?, sentAt }`.
- `WorkerProfile.workHistory[]`: `{ company, role, from, to? }` (years; no `to` = still there).

Backend still to do: close jobs automatically at `deadline` (search already hides them), real distance for "Near me" (needs coordinates), email verification for employers.
