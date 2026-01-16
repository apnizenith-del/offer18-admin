import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const COOKIE = "cc_session";

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}
function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
}

export async function setSession(adminId: string, ip?: string, userAgent?: string) {
  const token = makeToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.adminSession.create({
    data: {
      id: id26(),
      adminId,
      tokenHash,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    },
  });

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    await prisma.adminSession.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookies().delete(COOKIE);
}

export async function getSessionAdmin() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findFirst({
    where: { tokenHash: sha256(token), revokedAt: null, expiresAt: { gt: new Date() } },
    include: {
      admin: {
        include: {
          roles: {
            include: {
              role: { include: { perms: { include: { permission: true } } } },
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  const perms = session.admin.roles.flatMap((rm) => rm.role.perms.map((p) => p.permission.permKey));
  return { admin: session.admin, permissions: Array.from(new Set(perms)) };
}
