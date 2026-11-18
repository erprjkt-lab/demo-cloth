# Job Challan – Yash Enterprise

Mobile-first web app that records fabric given to stitching jobbers on challans.
Next.js 15 · Prisma · PostgreSQL · iron-session · Cloudinary · Web Push.

## Setup

1. Create the database: `createdb -U postgres job_challan` (or with pgAdmin).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` / `DIRECT_URL`, `SESSION_SECRET` (32+ chars) and `SEED_ADMIN_PASSWORD`.
3. Install and set up:
   ```
   npm install
   npm run db:migrate -- --name init
   npm run db:seed
   npm run dev -- -H 0.0.0.0
   ```
4. Open http://localhost:3000 (or `http://<PC-IP>:3000` on a phone on the same Wi-Fi) and sign in as the seeded admin.

Photos need the three `CLOUDINARY_*` variables; without them everything else works and photo upload says it is not set up.

## Features

- **Challans** with lines (colour × Top/Pant/Dupatta) and lumps; totals are always summed from lumps.
- **History**: the jobber page shows meters and challans per catalogue; the catalogue page shows which jobber holds how many meters per design and part.
- **Job transfer** (challan page → Transfer, or Home → Job transfer): full moves the challan; custom moves the selected lumps into a new child challan. Every transfer is logged.
- **Tasks**: office assigns to anyone (including a jobber's login); the assignee sees it in the Tasks tab and can mark it done. Due reminders show under Tasks → Reminders.
- **PWA + push**: installable (Add to Home Screen). Tasks tab → turn on notifications. A new task pushes immediately; reminders push when `/api/cron/reminders` runs. On iPhone, push only works from the installed app. Push needs HTTPS (or localhost).

## Roles

| Role | Can do |
|------|--------|
| ADMIN | Everything, including users and deletes (soft delete) |
| STAFF | Jobbers, catalogues, challans, transfers, tasks: create, edit, view all |
| JOBBER | Only their own challans (read-only) and their own tasks |

Every page and Server Action calls `requireUser()` in `src/lib/auth.ts`. Jobber ownership is enforced in the query (`challanScope`).

## Checks

`npm run check` runs the validation self-check (lump limits, exact meter totals, size ratio, IST times). `npm run build` typechecks and lints.

## Deploy

1. Neon: pooled string in `DATABASE_URL`, direct string in `DIRECT_URL`, then `npx prisma migrate deploy` and `npm run db:seed`.
2. Host the Next.js app with all `.env` variables set. Check Vercel Hobby's commercial-use terms first.
3. GitHub repo secrets for the workflows in `.github/workflows`:
   - `backup.yml` (weekly pg_dump, kept 90 days as an artifact): `DATABASE_URL` (Neon direct string).
   - `reminders.yml` (every 15 min): `APP_URL`, `CRON_SECRET`.
4. New VAPID keys for production: `npx web-push generate-vapid-keys`.

## Not done yet

See [NEXT-STEPS.md](NEXT-STEPS.md) for database and `.env` setup, owner decisions, the prototype import and deploy.
