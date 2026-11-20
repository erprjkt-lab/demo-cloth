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
   npm run dev
   ```
4. Open http://localhost:3000 (or `http://<PC-IP>:3000` on a phone on the same Wi-Fi) and sign in as the seeded admin.

Photos need the three `CLOUDINARY_*` variables; without them everything else works and photo upload says it is not set up.

## Run with Docker

Needs Docker Desktop (or Docker Engine + Compose v2). Starts Postgres, applies the schema, seeds the admin, runs the app and a 15-minute reminders cron.

1. Copy `.env.example` to `.env` and fill in at least `SESSION_SECRET` and `SEED_ADMIN_PASSWORD` (plus `CRON_SECRET`, Cloudinary and VAPID keys if you use them). `DATABASE_URL` / `DIRECT_URL` are ignored; the containers use the bundled database.
2. Start:
   ```
   docker compose up -d --build
   ```
3. Open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `docker compose logs -f app` | Follow app logs |
| `docker compose up -d --build` | Rebuild after code changes (schema changes are applied on start) |
| `docker compose down` | Stop everything (data is kept) |
| `docker compose down -v` | Stop and **delete** the database |
| `docker compose exec db psql -U postgres job_challan` | Open a SQL shell |

Optional `.env` overrides: `APP_PORT` (default 3000), `DB_PORT` (5432), `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, `POSTGRES_HOST` (default `db`, the bundled container; set to e.g. `db.some.co` for an external server) / `POSTGRES_PORT` (5432) / `POSTGRES_SSLMODE` (`disable`; use `require` for hosted Postgres), and `COOKIE_SECURE=true` once the app is served over HTTPS. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is baked in at build time, so rebuild after changing it.

## Features

UI follows CoreFlow ERP: Ant Design 6 with CoreFlow's theme, dark sidebar, and every list as a table (cards on phones) with drawers for create/edit.

- **Job Work**: office creates a job (jobber, catalogue, pieces, due date) and links challans to it. The status flow is Assigned → Material Received → In Progress → Finished → Sent Back → Completed. The jobber takes the middle four steps from their login; the office confirms Completed. Every change is logged with who and when, and the other side gets a push notification.
- **Challans** with lines (colour × Top/Pant/Dupatta) and lumps; totals are always summed from lumps. Optionally linked to a job.
- **History**: the jobber page shows meters and challans per catalogue; the catalogue page shows which jobber holds how many meters per design and part.
- **Job transfer** (challan page → Transfer, or Home → Job transfer): full moves the challan; custom moves the selected lumps into a new child challan. Every transfer is logged.
- **Tasks**: office assigns to anyone (including a jobber's login); the assignee sees it in the Tasks tab and can mark it done. Due reminders show under Tasks → Reminders.
- **PWA + push**: installable (Add to Home Screen). Tasks tab → turn on notifications. A new task pushes immediately; reminders push when `/api/cron/reminders` runs. On iPhone, push only works from the installed app. Push needs HTTPS (or localhost).

## Masters

Admin → **Masters** holds the lists the app picks from: **Parts** (Top, Pant, Dupatta… on challan lines) and **Catalogue types** (Single, 2 pcs, 3 pcs…). Items can be added, renamed, reordered and hidden. Records point at an item by id, so a rename shows everywhere, and hiding only removes it from the pickers. A new database gets the starting lists from `npm run db:seed`.

## Roles and permissions

| Role | Default access |
|------|--------|
| ADMIN | Everything, always (can't be reduced) |
| STAFF | Job work, challans, catalogues, jobbers, transfers, tasks: read, create, edit. No deletes, users or permissions |
| JOBBER | Only their own jobs (update status), challans (read) and tasks (mark done) |

The **Permissions** page is switched off for now (`PERMISSIONS_ENABLED` in `src/lib/permissions.ts`), so everyone gets their role defaults above. When it is on, Admin → **Permissions** overrides the defaults per user: Read / Write / Modify / Delete per menu, as in CoreFlow. Rules live in `src/lib/permissions.ts`; every page and Server Action calls `requirePerm()` in `src/lib/auth.ts`, and jobbers' rows are filtered in the query (`jobberScope`). Jobbers can be created and edited but not deleted.

## Checks

`npm run check` runs the self-check (lump limits, exact meter totals, size ratio, job status rules, permissions). `npm run build` typechecks and lints.

## Deploy

1. Neon: pooled string in `DATABASE_URL`, direct string in `DIRECT_URL`, then `npx prisma migrate deploy` and `npm run db:seed`.
2. Host the Next.js app with all `.env` variables set. Check Vercel Hobby's commercial-use terms first.
3. GitHub repo secrets for the workflows in `.github/workflows`:
   - `backup.yml` (weekly pg_dump, kept 90 days as an artifact): `DATABASE_URL` (Neon direct string).
   - `reminders.yml` (every 15 min): `APP_URL`, `CRON_SECRET`.
4. New VAPID keys for production: `npx web-push generate-vapid-keys`.

## Not done yet

See [NEXT-STEPS.md](NEXT-STEPS.md) for database and `.env` setup, owner decisions, the prototype import and deploy.
