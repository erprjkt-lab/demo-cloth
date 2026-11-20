import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { db } from "./db";
import { can, effectivePerms, PERMISSIONS_ENABLED, type Action, type ModuleKey } from "./permissions";

export const SESSION_COOKIE = "jc_session";

export async function getSession() {
  return getIronSession<{ userId?: string }>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: SESSION_COOKIE,
    ttl: 60 * 60 * 24 * 30,
    // COOKIE_SECURE=false lets a production build work over plain http (e.g. Docker on a LAN IP).
    cookieOptions: {
      secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  });
}

// Loaded once per request; inactive users count as signed out.
export const getUser = cache(async () => {
  const { userId } = await getSession();
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      jobberId: true,
      isActive: true,
      permissions: { select: { module: true, read: true, write: true, modify: true, delete: true, approve: true } },
    },
  });
  if (!user?.isActive) return null;
  const { permissions, ...rest } = user;
  const perms = effectivePerms(user.role, PERMISSIONS_ENABLED ? permissions : []);
  if (!PERMISSIONS_ENABLED) delete perms.permissions; // hides the menu; the page and its actions 404
  return { ...rest, perms };
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Signed-in user or redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Call first in every page, Server Action and route handler. No access = 404. */
export async function requirePerm(module: ModuleKey, action: Action = "read"): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.perms, module, action)) notFound();
  return user;
}

/** Prisma `where` for challans and job work this user may see: jobbers only their own. */
export const jobberScope = (user: SessionUser) =>
  user.role === "JOBBER" ? { jobberId: user.jobberId ?? "-" } : {};

/** Job work a user may see: jobbers only their own, and never drafts (not approved yet). */
export const jobScope = (user: SessionUser) =>
  user.role === "JOBBER" ? { jobberId: user.jobberId ?? "-", status: { not: "DRAFT" as const } } : {};
