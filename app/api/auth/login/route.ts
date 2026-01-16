import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import crypto from "crypto";

export async function POST(req: Request) {
  const { emailOrUsername, password } = await req.json();

  const admin = await prisma.adminUser.findFirst({
    where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  if (!admin || !admin.isActive) {
    await prisma.adminLoginLog.create({
      data: {
        id: id26(),
        adminId: admin?.id ?? null,
        email: emailOrUsername ?? null,
        ip,
        userAgent: ua,
        success: false,
        reason: "Invalid credentials",
      },
    });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  await prisma.adminLoginLog.create({
    data: {
      id: id26(),
      adminId: admin.id,
      email: admin.email,
      ip,
      userAgent: ua,
      success: ok,
      reason: ok ? null : "Invalid credentials",
    },
  });

  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  await setSession(admin.id, ip ?? undefined, ua ?? undefined);
  return NextResponse.json({ ok: true });
}

function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
}
