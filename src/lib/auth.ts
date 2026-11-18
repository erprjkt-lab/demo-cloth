import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "jc_session";

export async function getSession() {
  return getIronSession<{ userId?: string }>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: SESSION_COOKIE,
    ttl: 60 * 60 * 24 * 30,
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax" },
  });
}

// Loaded once per request; inactive users count as signed out.
export const getUser = cache(async () => {
  const { userId } = await getSession();
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, role: true, jobberId: true, isActive: true },
  });
  return user?.isActive ? user : null;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Call first in every page, Server Action and route handler. Wrong role = 404. */
export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) notFound();
  return user;
}

export const OFFICE: Role[] = ["ADMIN", "STAFF"];

/** Prisma `where` for challans this user may see: jobbers only their own. */
export const challanScope = (user: SessionUser) =>
  user.role === "JOBBER" ? { jobberId: user.jobberId ?? "-" } : {};
