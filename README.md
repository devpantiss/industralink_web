# IndustriaLink Dashboard

The web app for **workers**, **HR / employers** and **admins** of IndustriaLink, a job platform for blue-collar industrial jobs.
All data comes from the IndustriaLink backend (`industrialink-backend`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5174 (the backend must run on port 4000)
npm run build      # type-check + production build into dist/
```

Settings (`.env`, see `.env.example`):

| Name | What |
|---|---|
| `VITE_API_URL` | Backend address, e.g. `http://localhost:4000/api/v1` |
| `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_WHATSAPP`, `VITE_SUPPORT_EMAIL` | Optional. Contact lines on the Help page; each shows only when set |

In local development the login page shows **quick test logins** (worker, HR, admin). They use the backend's test login and never appear in a production build.

## What's inside

| Role | Screens |
|---|---|
| Worker | Onboarding · Home · Find jobs · Job details + apply · Companies · Applications + timeline · Saved · Profile + documents · Messages |
| HR / employer | Onboarding · Home · Jobs · Post / edit job · Hiring board · Candidates · Company + verification · Messages |
| Admin | Home · Company approvals · Users · Jobs · Reports & help · Activity log · Settings |

Also: English, Hindi and Odia; light and dark mode; live chat with typing and seen ticks.

## Product rules

- **Login:** "I'm looking for a job" (mobile + code) or "I'm hiring" (email). Admin has its own unlinked page.
- **No document verification.** Only **companies** are approved by admin, to keep fake jobs out.
- **Calling HR:** the HR number is never public. A worker sees Call / WhatsApp / Message only after being **shortlisted**.

## Folder structure

```
src/
  app/                router, login state, role guards, app shell
  api/                the ONLY place that talks to the backend (one file per area)
  components/ui/      shared building blocks (Button, Field, Card, EmptyState, illustrations…)
  components/domain/  job-specific pieces (JobCard, Timeline…)
  pages/              one folder per role: auth/, worker/, employer/, admin/, shared/, public/
  hooks/              small shared hooks
  lib/                formatting, labels, translations, theme
  styles/             design tokens (colours, light and dark)
  types/              data shapes returned by the backend
```

The API contract lives in the backend repo: `industrialink-backend/docs/API_CONTRACT.md`.

The landing site reads open jobs from `/feed.json`. In development this is passed through to the backend (`GET /api/v1/public/feed`); on a live server point the landing site at that backend address.
