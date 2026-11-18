import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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
}

main().finally(() => db.$disconnect());
