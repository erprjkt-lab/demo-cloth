import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Starting master lists; admins change them later on the Masters page.
const MASTERS = {
  PART: ["Top", "Pant", "Dupatta"],
  CATALOG_TYPE: ["Single", "2 pcs", "3 pcs"],
} as const;

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set SEED_ADMIN_PASSWORD (8+ chars) in .env");

  // Safe to re-run: never overwrites an existing admin's password.
  await db.user.upsert({
    where: { username },
    update: {},
    create: { username, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin user "${username}" ready`);

  // Only fills an empty list, so renames and hidden items made on the Masters page survive a re-run.
  for (const [kind, names] of Object.entries(MASTERS) as [keyof typeof MASTERS, readonly string[]][]) {
    if (await db.masterItem.count({ where: { kind } })) continue;
    await db.masterItem.createMany({ data: names.map((name, sort) => ({ kind, name, sort })) });
    console.log(`Master list ${kind} filled`);
  }
}

main().finally(() => db.$disconnect());
