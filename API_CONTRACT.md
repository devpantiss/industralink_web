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
| GET | `/jobs` | query: `JobSearchParams` | `Paginated<JobForWorker>` (page size 10, only active jobs, unpaid jobs last) | |
| GET | `/jobs/:id` | | `JobForWorker` (**never includes `hrPhone`**) | 404 `NOT_FOUND` |
| GET | `/companies/:id` | | `CompanyForWorker` (company without GST + its active jobs) | 404 |
| POST / DELETE | `/jobs/:id/save` | | `{ saved }` | |
| GET | `/worker/saved` | | `JobForWorker[]` | |
| POST | `/jobs/:id/apply` | `{ sentWith: "profile" \| "document", documentId? }` | `Application` | 410 `JOB_CLOSED`, 409 `ALREADY_APPLIED`, 409 `WITHDRAWN` |
| GET | `/worker/applications` | | `WorkerApplication[]`. `contact` is set only when stage ≥ shortlisted **and** `job.allowCalls` | |
| GET | `/worker/applications/:id` | | `WorkerApplication` | 404 |
| POST | `/worker/applications/:id/withdraw` | | `Application` | 409 `CLOSED` |
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
| PATCH | `/employer/applications/:id` | `{ stage, note?, notify?, interview?: { at, place } }` | `Candidate` | 409 `WITHDRAWN`, 422 (interview time in the past) |
| GET / PATCH | `/employer/company` | PATCH: `Partial<Company>` + `resubmit?: boolean` | `Company` | |

Moving a candidate sends the worker a notification (rejection only if `notify` isn't `false`).

## Admin (role = admin)

| Method | Path | Body / query | Returns | Notable errors |
|---|---|---|---|---|
| GET | `/admin/summary` | | `AdminSummary` | |
| GET | `/admin/verifications` | query: `status?` (default pending) | `VerificationItem[]` (companies only) | |
| POST | `/admin/verifications/company/:id` | `{ decision: "approve" \| "reject", reason? }` | `{ ok }` | 422 (reject without reason), 409 `ALREADY_DONE` |
| GET | `/admin/jobs` | query: `q?`, `status?` | `AdminJobRow[]` | |
| POST | `/admin/jobs/:id/remove` | `{ reason }` | `{ ok }` (closes the job, tells the company) | 422 |
| GET | `/admin/users` | query: `role`, `q?`, `status?` | `AdminUserRow[]` | |
| PATCH | `/admin/users/:id` | `{ status }` | `{ ok }` | 400 `SELF` |
| GET | `/admin/user-impact/:id` | | `{ activeJobs, applicants }` (shown before blocking a company) | |
| GET | `/admin/audit` | | `AuditEntry[]` | |

Every admin decision is written to the audit log.
