# Project rules

## Database schema changes (Prisma)

Every change to `prisma/schema.prisma` must ship with a migration in the same change. No exceptions.

- After editing the schema, run `npm run db:migrate -- --name <short_snake_case_description>`
  (this is `prisma migrate dev`). Commit the generated `prisma/migrations/<timestamp>_<name>/` folder
  together with the schema change.
- Never use `prisma db push`, and never use `--force-reset` or `prisma migrate reset`, unless the user explicitly asks for it.
  They skip migration history or wipe data.
- Never edit a migration that has already been committed or applied. Fix mistakes with a new migration.
- Adding a required column to a table that may already hold rows: either give it a `@default(...)`, or
  run `npm run db:migrate -- --name <name> --create-only`, edit the SQL to backfill existing rows (add nullable →
  `UPDATE` → `SET NOT NULL`), then run `npm run db:migrate` to apply it.
- If `migrate dev` reports drift or asks to reset the database, stop and ask the user. Do not accept the reset.
- Deployments and other machines apply migrations with `npx prisma migrate deploy`. That command never generates SQL.
- After a reset, the admin user is recreated with `npx prisma db seed`.
