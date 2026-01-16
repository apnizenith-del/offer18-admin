import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const offerId = url.searchParams.get("offer_id")?.trim();
  const affiliateId = url.searchParams.get("aff_id")?.trim();
  const smartlinkId = url.searchParams.get("sl_id")?.trim() ?? null;

  if (!offerId || !affiliateId) {
    return text(400, "Missing offer_id or aff_id");
  }

  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const country = getCountry(req) ?? null;
  const device = detectDevice(ua);
  const os = detectOS(ua);
  const browser = detectBrowser(ua);

  const subid1 = url.searchParams.get("subid1") ?? null;
  const subid2 = url.searchParams.get("subid2") ?? null;
  const subid3 = url.searchParams.get("subid3") ?? null;
  const source = url.searchParams.get("source") ?? null;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      tracking: true,
      caps: true,
      rules: true,
      targetGeo: true,
      targetDevice: true,
      timeTargeting: true,
    } as any,
  });

  const trackUrl =
  Array.isArray((offer as any).tracking)
    ? (offer as any).tracking[0]?.trackUrl
    : (offer as any).tracking?.trackUrl;

if (!offer || offer.status !== "active" || !trackUrl) {
    await logFraud("offer_blocked", { offerId, affiliateId, ip, ua, country });
    return text(404, "Offer not available");
  }

  const aff = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
  if (!aff || aff.status !== "active") {
    await logFraud("affiliate_blocked", { offerId, affiliateId, ip, ua, country });
    return text(403, "Affiliate not allowed");
  }

  const access = await prisma.affiliateOfferAccess.findUnique({
    where: { affiliateId_offerId: { affiliateId, offerId } } as any,
  });

  if (access && access.isAllowed === false) {
    await logFraud("affiliate_offer_denied", { offerId, affiliateId, ip, ua, country });
    return text(403, "Offer access denied");
  }

  const targetingOk = checkTargeting({ offer, country, device, now: new Date() });
  if (!targetingOk.ok) {
    await logFraud("targeting_block", {
      offerId,
      affiliateId,
      ip,
      ua,
      country,
      reason: targetingOk.reason,
    });
    return text(403, `Blocked: ${targetingOk.reason}`);
  }

  const capOk = await checkCaps({ offer, offerId });
  if (!capOk.ok) {
    await logFraud("cap_reached", { offerId, affiliateId, ip, ua, country, reason: capOk.reason });
    return text(429, `Cap reached: ${capOk.reason}`);
  }

  const fingerprint = makeFingerprint(ip, ua);
  const uniqueSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.click.findFirst({
    where: { offerId, fingerprint, createdAt: { gte: uniqueSince } },
    select: { id: true },
  });
  const isUnique = existing ? 0 : 1;

  const clickId = id26();

  await prisma.click.create({
    data: {
      id: clickId,
      offerId,
      affiliateId,
      smartlinkId,
      subid1,
      subid2,
      subid3,
      source,
      ip,
      ua,
      country,
      device,
      os,
      browser,
      referer: req.headers.get("referer") ?? null,
      isUnique,
      fingerprint,
      createdAt: new Date(),
    } as any,
  });

  const redirectUrl = expandMacros(trackUrl, {
  click_id: clickId,
  offer_id: offerId,
  aff_id: affiliateId,
  sl_id: smartlinkId ?? "",
  subid1: subid1 ?? "",
  subid2: subid2 ?? "",
  subid3: subid3 ?? "",
  source: source ?? "",
  country: country ?? "",
  device: device ?? "",
  os: os ?? "",
  browser: browser ?? "",
  ip: ip ?? "",
  ua: ua ?? "",
  timestamp: String(Date.now()),
});

  return NextResponse.redirect(redirectUrl, { status: 302 });
}

function text(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
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
  const h = req.headers.get("x-country");
  if (h && h !== "XX") return h.toUpperCase();
  return null;
}

function detectDevice(ua: string) {
  const u = ua.toLowerCase();
  if (u.includes("ipad") || u.includes("tablet")) return "tablet";
  if (u.includes("mobi") || u.includes("android") || u.includes("iphone")) return "mobile";
  return "desktop";
}

function detectOS(ua: string) {
  const u = ua.toLowerCase();
  if (u.includes("windows")) return "windows";
  if (u.includes("mac os") || u.includes("macintosh")) return "macos";
  if (u.includes("android")) return "android";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ios")) return "ios";
  if (u.includes("linux")) return "linux";
  return "unknown";
}

function detectBrowser(ua: string) {
  const u = ua.toLowerCase();
  if (u.includes("edg/")) return "edge";
  if (u.includes("chrome/") && !u.includes("edg/")) return "chrome";
  if (u.includes("safari/") && !u.includes("chrome/")) return "safari";
  if (u.includes("firefox/")) return "firefox";
  return "unknown";
}

function makeFingerprint(ip: string | null, ua: string) {
  const base = `${ip ?? ""}::${ua ?? ""}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 64);
}

function expandMacros(template: string, vars: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => vars[key] ?? "");
}

function checkTargeting(opts: {
  offer: any;
  country: string | null;
  device: string;
  now: Date;
}): { ok: boolean; reason?: string } {
  const { offer, country, device, now } = opts;

  if (offer.targetGeo?.length) {
    const allow = offer.targetGeo.filter((x: any) => x.mode === "allow").map((x: any) => x.country);
    const deny = offer.targetGeo.filter((x: any) => x.mode === "deny").map((x: any) => x.country);

    if (deny.length && country && deny.includes(country)) return { ok: false, reason: "GEO denied" };
    if (allow.length) {
      if (!country) return { ok: false, reason: "GEO required" };
      if (!allow.includes(country)) return { ok: false, reason: "GEO not allowed" };
    }
  }

  if (offer.targetDevice?.length) {
    const allow = offer.targetDevice.filter((x: any) => x.mode === "allow").map((x: any) => x.device);
    const deny = offer.targetDevice.filter((x: any) => x.mode === "deny").map((x: any) => x.device);

    if (deny.length && deny.includes(device)) return { ok: false, reason: "Device denied" };
    if (allow.length && !allow.includes(device)) return { ok: false, reason: "Device not allowed" };
  }

  const tt = offer.timeTargeting;
  if (tt?.daysJson || tt?.hoursJson) {
    const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()];
    const hour = now.getUTCHours();
    const days: string[] = Array.isArray(tt.daysJson) ? tt.daysJson : [];
    const hours: number[] = Array.isArray(tt.hoursJson) ? tt.hoursJson : [];

    if (days.length && !days.includes(day)) return { ok: false, reason: "Day blocked" };
    if (hours.length && !hours.includes(hour)) return { ok: false, reason: "Hour blocked" };
  }

  return { ok: true };
}

async function checkCaps(opts: { offer: any; offerId: string }): Promise<{ ok: boolean; reason?: string }> {
  const { offer, offerId } = opts;
  const caps = offer.caps ?? [];
  if (!caps.length) return { ok: true };

  const now = new Date();

  for (const cap of caps) {
    const type = cap.capType ?? cap.type;
    const limit = cap.capLimit ?? cap.limit;
    if (!type || !limit) continue;

    let start: Date | null = null;
    if (type === "hourly") {
      start = new Date(now);
      start.setMinutes(0, 0, 0);
    } else if (type === "daily") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (type === "global") {
      start = null;
    }

    const count = await prisma.click.count({
      where: {
        offerId,
        ...(start ? { createdAt: { gte: start } } : {}),
      },
    });

    if (count >= Number(limit)) {
      return { ok: false, reason: `${type} cap (${limit})` };
    }
  }

  return { ok: true };
}

async function logFraud(eventType: string, meta: any) {
  try {
    await prisma.fraudEvent.create({
      data: { id: id26(), eventType, severity: "low", meta, createdAt: new Date() } as any,
    });
  } catch {
    // ignore
  }
}
