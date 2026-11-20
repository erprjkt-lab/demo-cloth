// One-off: turns the old fixed Part and Catalogue-type enums into Masters rows, keeping every
// existing challan line and catalogue pointed at the same value.
// Run BEFORE `npx prisma db push` on a database created before Masters existed:
//   npx tsx scripts/migrate-masters.ts
// Safe to re-run: it does nothing once the old columns are gone (and on a brand-new database).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Old enum value → master item (fixed ids so the UPDATEs below can map them).
const PARTS = [
  ["TOP", "part_top", "Top"],
  ["PANT", "part_pant", "Pant"],
  ["DUPATTA", "part_dupatta", "Dupatta"],
] as const;
const TYPES = [
  ["SINGLE", "type_single", "Single"],
  ["TWO_PC", "type_2pc", "2 pcs"],
  ["THREE_PC", "type_3pc", "3 pcs"],
] as const;

const caseSql = (col: string, rows: readonly (readonly [string, string, string])[]) =>
  `CASE "${col}"::text ${rows.map(([v, id]) => `WHEN '${v}' THEN '${id}'`).join(" ")} END`;

async function main() {
  const [{ legacy }] = await db.$queryRaw<{ legacy: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ChallanLine' AND column_name = 'partType') AS legacy`;
  if (!legacy) {
    console.log("Nothing to migrate (no old part/type columns). Run: npx prisma db push");
    return;
  }

  await db.$transaction(async (tx) => {
    const run = (sql: string) => tx.$executeRawUnsafe(sql);
    await run(`CREATE TYPE "MasterKind" AS ENUM ('PART', 'CATALOG_TYPE')`);
    await run(`CREATE TABLE "MasterItem" (
      "id" TEXT NOT NULL, "kind" "MasterKind" NOT NULL, "name" TEXT NOT NULL,
      "sort" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "MasterItem_pkey" PRIMARY KEY ("id"))`);
    const items = [...PARTS.map((p, i) => [...p, "PART", i] as const), ...TYPES.map((t, i) => [...t, "CATALOG_TYPE", i] as const)];
    for (const [, id, name, kind, sort] of items) {
      await run(`INSERT INTO "MasterItem" ("id","kind","name","sort","updatedAt") VALUES ('${id}','${kind}','${name}',${sort},CURRENT_TIMESTAMP)`);
    }
    // Same index `db push` would add; creating it here keeps `db push` free of data-loss prompts.
    await run(`CREATE UNIQUE INDEX "MasterItem_kind_name_key" ON "MasterItem"("kind", "name")`);

    await run(`ALTER TABLE "ChallanLine" ADD COLUMN "partId" TEXT`);
    await run(`UPDATE "ChallanLine" SET "partId" = ${caseSql("partType", PARTS)}`);
    await run(`ALTER TABLE "ChallanLine" ALTER COLUMN "partId" SET NOT NULL, DROP COLUMN "partType"`);

    await run(`ALTER TABLE "Catalog" ADD COLUMN "typeId" TEXT`);
    await run(`UPDATE "Catalog" SET "typeId" = ${caseSql("type", TYPES)}`);
    await run(`ALTER TABLE "Catalog" ALTER COLUMN "typeId" SET NOT NULL, DROP COLUMN "type"`);

    await run(`DROP TYPE "PartType"`);
    await run(`DROP TYPE "CatalogType"`);
  });
  console.log("Migrated parts and catalogue types to Masters. Now run: npx prisma db push");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
