"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OfferForm, OfferFormSchema } from "@/lib/validators/offer";

const steps = ["Basics", "Tracking", "Targeting", "Rules & Distribution"] as const;

export default function NewOfferPage() {
  const [step, setStep] = useState(0);

  const form = useForm<OfferForm>({
    resolver: zodResolver(OfferFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      type: "CPA",
      status: "active",
      currency: "USD",
      payoutDefault: 0,
      revenueDefault: 0,
      allowIncent: false,
      tracking: { previewUrl: "", trackUrl: "" },
      targeting: { geoAllow: [], geoDeny: [], devices: [] },
      rules: {
        conversionWindowSec: 0,
        holdPeriodSec: 0,
        duplicateRule: { mode: "txn_id", windowSec: 0 },
        trafficRestrictions: { allowSources: [], denySources: [], denyIsps: [], denyCarriers: [] },
      },
    },
  });

  async function onSubmit(values: OfferForm) {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      alert("Failed to create offer");
      return;
    }
    window.location.href = "/offers";
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create Offer</h1>
        <div className="text-sm text-white/60">{steps[step]}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`px-3 py-1 rounded-lg border ${i === step ? "bg-white text-black" : "bg-white/5 border-white/10"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {step === 0 && <Basics form={form} />}
        {step === 1 && <Tracking form={form} />}
        {step === 2 && <Targeting form={form} />}
        {step === 3 && <Rules form={form} />}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="px-4 py-2 rounded-xl bg-white text-black"
            >
              Next
            </button>
          ) : (
            <button type="submit" className="px-4 py-2 rounded-xl bg-white text-black">
              Create Offer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm text-white/70 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Basics({ form }: any) {
  const r = form.register;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Offer Name">
        <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("name")} />
      </Field>
      <Field label="Type">
        <select className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("type")}> 
          <option value="CPI">CPI</option>
          <option value="CPA">CPA</option>
          <option value="CPL">CPL</option>
          <option value="CPS">CPS</option>
        </select>
      </Field>
      <Field label="Status">
        <select className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("status")}> 
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </Field>
      <Field label="Currency">
        <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("currency")} />
      </Field>
      <Field label="Default Payout">
        <input type="number" step="0.000001" className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("payoutDefault")} />
      </Field>
      <Field label="Default Revenue">
        <input type="number" step="0.000001" className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("revenueDefault")} />
      </Field>
      <Field label="Allow Incent">
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...r("allowIncent")} />
          <span className="text-white/70">Enable incent traffic</span>
        </div>
      </Field>
      <Field label="Category">
        <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("category")} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Description">
          <textarea className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" rows={4} {...r("description")} />
        </Field>
      </div>
    </div>
  );
}

function Tracking({ form }: any) {
  const r = form.register;
  return (
    <div className="grid gap-4">
      <Field label="Preview URL">
        <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("tracking.previewUrl")} />
      </Field>
      <Field label="Tracking URL (redirect template)">
        <input
          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2"
          placeholder="https://advertiser.com/?clickid={click_id}&sub1={subid1}"
          {...r("tracking.trackUrl")}
        />
      </Field>
      <div className="text-xs text-white/60">
        Use macros like <b>{`{click_id}`}</b>, <b>{`{subid1}`}</b>, <b>{`{country}`}</b>, <b>{`{device}`}</b>
      </div>
    </div>
  );
}

function Targeting({ form }: any) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="GEO Allow (CSV ISO2)">
        <input
          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2"
          placeholder="US,IN,GB"
          onChange={(e) => form.setValue("targeting.geoAllow", csv2(e.target.value))}
        />
      </Field>
      <Field label="GEO Deny (CSV ISO2)">
        <input
          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2"
          placeholder="CN,RU"
          onChange={(e) => form.setValue("targeting.geoDeny", csv2(e.target.value))}
        />
      </Field>
      <Field label="Devices">
        <div className="flex gap-3 text-sm">
          {(["mobile", "desktop", "tablet"] as const).map((d) => (
            <label key={d} className="flex items-center gap-2">
              <input
                type="checkbox"
                onChange={(e) => {
                  const cur = form.getValues("targeting.devices") ?? [];
                  form.setValue("targeting.devices", e.target.checked ? [...cur, d] : cur.filter((x: string) => x !== d));
                }}
              />
              {d}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Rules({ form }: any) {
  const r = form.register;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Conversion Window (sec)">
        <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("rules.conversionWindowSec")} />
      </Field>
      <Field label="Hold Period (sec)">
        <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("rules.holdPeriodSec")} />
      </Field>

      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium mb-3">Duplicate Rule</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Mode">
            <select className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("rules.duplicateRule.mode")}>
              <option value="none">None</option>
              <option value="txn_id">Transaction ID (recommended)</option>
              <option value="click+ip">Click + IP</option>
              <option value="subid+offer">SubID + Offer</option>
            </select>
          </Field>
          <Field label="Dedup Window (sec)">
            <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" {...r("rules.duplicateRule.windowSec")} />
          </Field>
        </div>
      </div>

      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium mb-3">Traffic Restrictions</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Allow Sources (CSV)">
            <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" onChange={(e) => form.setValue("rules.trafficRestrictions.allowSources", csvAny(e.target.value))} />
          </Field>
          <Field label="Deny Sources (CSV)">
            <input className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2" onChange={(e) => form.setValue("rules.trafficRestrictions.denySources", csvAny(e.target.value))} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function csv2(s: string) {
  return s
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x) => x.length === 2);
}

function csvAny(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
