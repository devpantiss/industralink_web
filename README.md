# IndustriaLink Dashboard

The logged-in app for **Workers**, **Employers** and **Admins** of IndustriaLink, a job platform for blue-collar industrial jobs.
It is frontend only for now: all data comes from a **mock API** inside the browser. It can be switched to the real backend later with one setting.

## Run it

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # type-check + production build into dist/
```

## Demo accounts

| Role | Where | Login | Password / code |
|---|---|---|---|
| Worker | `/login` → "I'm looking for a job" | Mobile `9876543210` | any 6 digits (`000000` shows the "wrong code" error) |
| Employer (verified) | `/login` → "I'm hiring" | `hr@vedanta.demo` | `demo1234` |
| Employer (not verified) | `/login` → "I'm hiring" | `hr@eastline.demo` | `demo1234` |
| Admin | `/admin/login` (not linked publicly) | `admin@industrialink.demo` | `demo1234` |

You can also sign up as a new worker or employer. Demo changes are saved in your browser.
**Profile menu → Reset demo data** restores the starting data.

## What's inside

| Role | Screens |
|---|---|
| Worker | Onboarding (3 tap-based steps) · "Complete your profile / upload resume" banner until done · Home · Find Jobs · Job details + Apply · Company pages · Applications + timeline · Saved · Profile + documents (camera/photo/PDF) |
| Employer | Onboarding · Home (funnel, attention list) · Jobs · Post/Edit job (templates, live preview, call settings) · Hiring board (drag and drop, interviews, bulk actions) · Candidates (all applicants) · Resume/document preview for every candidate · Company + verification |
| Admin | Home · Company approvals · Users (block/unblock) · Jobs (remove bad jobs) · Activity log |

### Product rules (decided)

- **Login:** the first choice is "I'm looking for a job" (mobile + code) or "I'm hiring" (email + password). Admin has its own hidden page.
- **No document verification.** Workers upload their resume and certificates, and employers see them. Only **companies** are approved by admin, to keep fake jobs out.
- **Calling HR:** the HR number is never shown on public job posts. A worker sees "Call HR / WhatsApp" only after being **shortlisted**, and only if the employer turned calls on (with call hours). Employers can always call candidates.

**Colours:** default palette is **Deep Teal** (dark teal sidebar, teal buttons, amber highlights). Two alternatives, **Industrial Orange** and **Graphite**, can be tried from *Profile menu → Colour theme* or with `?palette=orange` / `?palette=graphite` in the URL. All values are tokens in `src/styles/index.css`. Once one is chosen, delete the other two blocks and the switcher (`src/lib/palette.ts`).

Design follows the "Steel & Safety" theme from the dashboard plan (`my-notes/DASHBOARD_PLAN.md`, kept outside this repo): tokens are in `src/styles/index.css` and `tailwind.config.js`.

## Folder structure

```
src/
  app/            router, login state, role guards, app shell (sidebar, top bar, mobile tabs)
  api/            the ONLY place that talks to the server (one file per role)
  mocks/          fake backend: seed data + handlers for every endpoint
  components/ui/  shared building blocks (Button, Field, Card, Badge, Drawer, Modal, Toast…)
  components/domain/  job-specific pieces (JobCard, Timeline, benefit chips…)
  pages/          one folder per role: auth/, worker/, employer/, admin/
  hooks/          small shared data hooks
  lib/            formatting (₹, dates), labels (all display text for enums), helpers
  types/          data shapes shared by UI, mocks and the future backend
```

## Switching from mock data to the real API

Screens never import mock data. They call functions in `src/api/*`, which use one axios client (`src/api/client.ts`).

1. Build the backend endpoints listed in **[API_CONTRACT.md](API_CONTRACT.md)**. They return the shapes in `src/types/index.ts`.
2. In `.env` set:
   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=https://your-api.example.com/api/v1
   ```
3. Restart `npm run dev`. Nothing else changes.

You can move over one area at a time: keep mocks on and point only some calls at the real server while it is being built.

## Known limits (demo)

- OTP, file storage and notifications are simulated. Uploaded files only exist until the page is refreshed.
- English only, but all enum labels live in `src/lib/labels.ts`, ready for Hindi.
- Not built yet (planned): in-app messages (Call/WhatsApp after shortlisting covers this for now), Hindi, dark mode.
