import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionAdmin } from "@/lib/auth/session";
import { requirePerm } from "@/lib/auth/rbac";
import { OfferFormSchema } from "@/lib/validators/offer";
import crypto from "crypto";

export async function POST(req: Request) {
  const s = await getSessionAdmin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  requirePerm(s.permissions, "offers.create");

  const body = await req.json();
  const data = OfferFormSchema.parse(body);

  const offer = await prisma.offer.create({
    data: {
      id: id26(),
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      type: data.type,
      status: data.status,
      currency: data.currency,
      payoutDefault: data.payoutDefault,
      revenueDefault: data.revenueDefault,
      allowIncent: data.allowIncent,
      tracking: {
        create: {
          id: id26(),
          previewUrl: data.tracking.previewUrl || null,
          trackUrl: data.tracking.trackUrl,
        },
      },
      rules: {
        create: {
          id: id26(),
          duplicateRule: data.rules.duplicateRule as any,
          conversionWindowSec: data.rules.conversionWindowSec || null,
          holdPeriodSec: data.rules.holdPeriodSec || null,
          ruleJson: data.rules.trafficRestrictions as any,
        },
      },
      targetGeo: {
        create: [
          ...data.targeting.geoAllow.map((c) => ({ id: id26(), country: c, mode: "allow" })),
          ...data.targeting.geoDeny.map((c) => ({ id: id26(), country: c, mode: "deny" })),
        ],
      },
      targetDevice: {
        create: data.targeting.devices.map((d) => ({ id: id26(), device: d, mode: "allow" })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      id: id26(),
      actorAdminId: s.admin.id,
      actorType: "admin",
      action: "offers.create",
      entityType: "offer",
      entityId: offer.id,
      meta: { name: offer.name },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  });

  return NextResponse.json({ ok: true, offerId: offer.id });
}

function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
}
