import { z } from "zod";

export const OfferType = z.enum(["CPI", "CPA", "CPL", "CPS"]);
export const OfferStatus = z.enum(["active", "paused"]);

export const OfferFormSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional(),
  type: OfferType,
  status: OfferStatus,
  currency: z.string().min(3).max(10),
  payoutDefault: z.coerce.number().min(0),
  revenueDefault: z.coerce.number().min(0),
  allowIncent: z.boolean(),
  tracking: z.object({
    previewUrl: z.string().url().optional().or(z.literal("")),
    trackUrl: z.string().min(8),
  }),
  targeting: z.object({
    geoAllow: z.array(z.string().length(2)).default([]),
    geoDeny: z.array(z.string().length(2)).default([]),
    devices: z.array(z.enum(["mobile", "desktop", "tablet"])).default([]),
  }),
  rules: z.object({
    conversionWindowSec: z.coerce.number().int().min(0).default(0),
    holdPeriodSec: z.coerce.number().int().min(0).default(0),
    duplicateRule: z.object({
      mode: z.enum(["none", "txn_id", "click+ip", "subid+offer"]).default("txn_id"),
      windowSec: z.coerce.number().int().min(0).default(0),
    }),
    trafficRestrictions: z
      .object({
        allowSources: z.array(z.string()).default([]),
        denySources: z.array(z.string()).default([]),
        denyIsps: z.array(z.string()).default([]),
        denyCarriers: z.array(z.string()).default([]),
      })
      .default({ allowSources: [], denySources: [], denyIsps: [], denyCarriers: [] }),
  }),
});

export type OfferForm = z.infer<typeof OfferFormSchema>;
