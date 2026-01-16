import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";

export async function GET() {
  const s = await getSessionAdmin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    admin: { id: s.admin.id, email: s.admin.email, username: s.admin.username },
    permissions: s.permissions,
  });
}
