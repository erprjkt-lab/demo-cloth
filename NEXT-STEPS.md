# Next steps

What is still needed before the Job Challan app is usable, in the order to do it. All 9 build phases from the developer plan are coded, the build passes, and `npm run check` passes. **Nothing has been run against a real database yet**, so step 1 is also the first real test.

## 1. Local database (needed before anything else)

- [ ] Make sure PostgreSQL is running (on the dev PC: Windows service `postgresql-x64-14`).
- [ ] Create the database: `createdb -U postgres job_challan`, or in pgAdmin create a database named `job_challan`.
- [ ] Copy `.env.example` to `.env` (step 2), then run:
  ```
  npm install
  npm run db:migrate -- --name init
  npm run db:seed
  npm run dev
  ```
- [ ] Commit the generated `prisma/migrations/` folder. Production applies these with `prisma migrate deploy`.

## 2. The `.env` file

`.env` is git-ignored and never committed. Copy `.env.example` and fill in:

| Variable | What to put | Where it comes from |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:<password>@localhost:5432/job_challan` locally; Neon **pooled** string in production | Your Postgres / Neon dashboard |
| `DIRECT_URL` | Same as `DATABASE_URL` locally; Neon **direct** string in production | Neon dashboard |
| `SESSION_SECRET` | 32+ random characters | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SEED_ADMIN_USERNAME` | First admin's user ID (default `admin`) | You choose |
| `SEED_ADMIN_PASSWORD` | First admin's password, 8+ characters | You choose; change it after first login |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Photo upload keys | Free account at cloudinary.com → Dashboard. Without them the app works, but photo upload shows "not set up". |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push notification keys | `npx web-push generate-vapid-keys`. Use a new pair for production. |
| `VAPID_SUBJECT` | `mailto:` + a real contact email | You choose |
| `CRON_SECRET` | Random string that protects `/api/cron/reminders` | Same command as `SESSION_SECRET` |

## 3. First test on a phone

Sign in as the seeded admin and walk through:

- [ ] **Users**: create a STAFF user (e.g. Aniket) and a JOBBER user linked to a jobber (e.g. Apex).
- [ ] **Jobbers**: create two jobbers.
- [ ] **Catalogues**: create one with a size ratio that adds up to pieces per design (e.g. S–XL at 50, XXL–5XL at 200 = 1,000).
- [ ] **Challans**: create one with two lines and several lumps, and check the totals.
- [ ] **Transfer**: do a full transfer, then a custom transfer of a few lumps. Check that the new challan and the history appear.
- [ ] **Tasks**: assign a task to the jobber login, then sign in as the jobber, see it in My Tasks and mark it done.
- [ ] **Security**:
  - The jobber login sees only its own challans; opening another jobber's challan URL shows "not found".
  - Five wrong passwords lock the account for 15 minutes.
  - A deactivated user cannot sign in.

## 4. Decisions to confirm with the owner

The app uses the developer plan's default for each. Changing one is a small code change, but do it before real data goes in.

- [ ] **Lump limits**: currently 1–500 m per lump and at most 100 lumps per line (`src/lib/validation.ts`). Paper challans run 20–130 m.
- [ ] **Roles**: STAFF can do everything except manage users and delete. Is that what "multiple access" means?
- [ ] **Challan structure**: one challan holds several colour × part lines, like the paper challan.
- [ ] **Partial transfer**: moved lumps go to a new challan linked to the original, and the original keeps the rest.
- [ ] **Challan numbers**: one running series (CH-0001…) forever, or restart each financial year?
- [ ] **Pieces vs meters**: is a pieces-per-meter figure needed to compare what was sent with what should come back?
- [ ] **Language**: should the jobber screens be in Gujarati or Hindi? Currently English.
- [ ] **Offline**: do jobbers need to work without signal? Currently online only.

## 5. Import the old prototype's data

- [ ] Find out where the prototype stores its challans (in the browser or on a server) and get an export (JSON or CSV).
- [ ] Write a one-off import script against that export. Not started: it depends on the format.

## 6. Production deploy

- [ ] **Hosting terms**: check them first. Vercel's free Hobby plan is for non-commercial use; a business app may need Vercel Pro or another host.
- [ ] **Database**: create a Neon database. Pooled string → `DATABASE_URL`, direct string → `DIRECT_URL`.
- [ ] **App**: deploy the Next.js app with every `.env` variable set in the host's settings. `npm install` runs `prisma generate` automatically.
- [ ] **Migrate and seed**: run `npx prisma migrate deploy` and `npm run db:seed` once against Neon.
- [ ] **HTTPS**: the app must be served over HTTPS. Push notifications and the installable app need it.
- [ ] **GitHub repo secrets** (Settings → Secrets and variables → Actions). The workflows do nothing until these are set:
  - `DATABASE_URL` (Neon **direct** string): weekly backup (`.github/workflows/backup.yml`), kept 90 days as a workflow artifact.
  - `APP_URL` and `CRON_SECRET`: task reminders every 15 minutes (`.github/workflows/reminders.yml`).
- [ ] **Restore test**: download one backup artifact and test a restore into a scratch database.

## 7. Trial

- [ ] Two real users (one office, one jobber) use it alongside the paper book for a week.
- [ ] On each jobber's phone, install it from the browser menu (Android: "Install app"; iPhone: Share → Add to Home Screen) and turn on notifications in My Tasks. On iPhone, notifications only work after adding to the Home Screen.

## Known limits (fine for v1, revisit later)

Each one is marked with a `ponytail:` comment in the code.

| Limit | Where | Fix when |
|---|---|---|
| Challan list shows the newest 100 only (search still finds older ones) | `src/app/(app)/challans/page.tsx` | More than ~100 challans in normal use |
| Office users see every task, with no "mine" filter | `src/app/(app)/tasks/page.tsx` | The task list gets long |
| Replaced photos are not deleted from Cloudinary | `src/app/(app)/catalogs/actions.ts` | Cloudinary storage gets tight |
| All times are Indian Standard Time | `src/lib/format.ts` | The business works across time zones |
| Lump limits are guesses | `src/lib/validation.ts` | The owner confirms (section 4) |

Out of scope for v1, per the plan: billing, payments, stock accounting, offline mode, native apps.
