import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { hashSessionToken, randomToken } from "./crypto";
import { canUseDatabase, sessionSecret } from "./database-url";

function tokenHash(token: string): string {
  return hashSessionToken(token, sessionSecret());
}

export const SESSION_COOKIE = "jobbenmin_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  providerProfile: {
    companyName: string;
    orgNumber: string;
    orgVerified: boolean;
  } | null;
};

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!canUseDatabase().ok) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: { include: { providerProfile: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } });
    }
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    phone: session.user.phone,
    providerProfile: session.user.providerProfile
      ? {
          companyName: session.user.providerProfile.companyName,
          orgNumber: session.user.providerProfile.orgNumber,
          orgVerified: session.user.providerProfile.orgVerified,
        }
      : null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
