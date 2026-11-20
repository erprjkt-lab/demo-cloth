"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
type FormState = { error?: string } | undefined;

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const WRONG = "Wrong user ID or password";

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return { error: WRONG };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many wrong attempts. Try again in 15 minutes." };
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    const lock = fails >= MAX_FAILS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MS) : null },
    });
    return { error: lock ? "Too many wrong attempts. Try again in 15 minutes." : WRONG };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect("/");
}

export async function logout() {
  (await getSession()).destroy();
  redirect("/login");
}
