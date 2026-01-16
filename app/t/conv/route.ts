import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const incoming = await readParams(req);

  const offerId = incoming.offer_id?.trim() || null;
  const clickId = incoming.click_id?.trim() || null;
  const transactionId = incoming.transaction_id?.trim() || null;

  if (!offerId && !clickId) return json(400, { ok: false, error: "Provide offer_id or click_id" });
  if (!transactionId) return json(400, { ok: false, error: "transaction_id required (best for dedup)" });

  const status = String(incoming.status ?? "pending").toLowerCase();
  if (!["pending", "approved", "rejected"].includes(status)) {
    return json(400, { ok: false, error: "Invalid status" });
  }

  const payout = toNum(incoming.payout, 0);
  const revenue = toNum(incoming.revenue, 0);
  const currency = String(incoming.currency ?? "USD").toUpperCase();
  const goal = incoming.goal ?? null;

  const ip = getIp(req);
  const country = getCountry(req);

  const offer = offerId
    ? await prisma.offer.findUnique({ where: { id: offerId }, include: { rules: true } as any })
    : null;

  const attributed = await findClickForConversion({
    clickId,
    offerId: offerId ?? null,
    subid1: incoming.subid1 ?? null,
    offerRules: offer?.rules ?? null,
  });

  const resolvedOfferId = offerId ?? attributed?.offerId ?? null;
  const resolvedAffiliateId = attributed?.affiliateId ?? null;

  if (!resolvedOfferId) return json(404, { ok: false, error: "Offer not found" });
  if (!resolvedAffiliateId) return json(404, { ok: false, error: "Affiliate not resolved" });

  const conversionId = id26();
  try {
    const created = await prisma.conversion.create({
      data: {
        id: conversionId,
        offerId: resolvedOfferId,
        affiliateId: resolvedAffiliateId,
        clickId: attributed?.id ?? null,
        status,
        payout,
        revenue,
        currency,
        goal,
        transactionId,
        subid1: incoming.subid1 ?? attributed?.subid1 ?? null,
        subid2: incoming.subid2 ?? attributed?.subid2 ?? null,
        ip: ip ?? null,
        country: country ?? attributed?.country ?? null,
        meta: incoming as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    });

    await safeHistory(created.id, "none", status, incoming.reason ?? null);

    return json(200, { ok: true, conversion_id: created.id, duplicate: false });
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      const existing = await prisma.conversion.findFirst({
        where: { offerId: resolvedOfferId, transactionId },
        select: { id: true, status: true },
      });
      return json(200, {
        ok: true,
        conversion_id: existing?.id ?? null,
        duplicate: true,
        status: existing?.status ?? null,
      });
    }
    return json(500, { ok: false, error: "Conversion ingest failed" });
  }
}

async function readParams(req: Request): Promise<Record<string, any>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (req.method === "POST" && contentType.includes("application/json")) {
    return (await req.json()) ?? {};
  }
  const u = new URL(req.url);
  const obj: Record<string, any> = {};
  u.searchParams.forEach((v, k) => (obj[k] = v));
  return obj;
}

function json(status: number, data: any) {
  return NextResponse.json(data, { status });
}

function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
}

function toNum(v: any, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

function getCountry(req: Request) {
  const cf = req.headers.get("cf-ipcountry");
  if (cf && cf !== "XX") return cf.toUpperCase();
  const vc = req.headers.get("x-vercel-ip-country");
  if (vc && vc !== "XX") return vc.toUpperCase();
  return null;
}

async function findClickForConversion(opts: {
  clickId: string | null;
  offerId: string | null;
  subid1: string | null;
  offerRules: any | null;
}) {
  const { clickId, offerId, subid1, offerRules } = opts;

  if (clickId) {
    return prisma.click.findUnique({
      where: { id: clickId },
      select: {
        id: true,
        offerId: true,
        affiliateId: true,
        subid1: true,
        subid2: true,
        country: true,
        createdAt: true,
      },
    });
  }

  if (!offerId) return null;

  const windowSec: number = offerRules?.conversionWindowSec ?? 0;
  const minTime = windowSec > 0 ? new Date(Date.now() - windowSec * 1000) : null;

  if (subid1) {
    return prisma.click.findFirst({
      where: {
        offerId,
        subid1,
        ...(minTime ? { createdAt: { gte: minTime } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        offerId: true,
        affiliateId: true,
        subid1: true,
        subid2: true,
        country: true,
        createdAt: true,
      },
    });
  }

  return null;
}

async function safeHistory(conversionId: string, fromStatus: string, toStatus: string, reason: string | null) {
  try {
    await prisma.conversionStatusHistory.create({
      data: { id: id26(), conversionId, fromStatus, toStatus, reason, createdAt: new Date() } as any,
    });
  } catch {
    // ignore if table not mapped yet
  }
}
