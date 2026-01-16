"use client";

import { useState } from "react";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#0B1220] text-white">
      <div className="p-10 flex flex-col justify-between border-r border-white/10">
        <div>
          <div className="text-2xl font-semibold">Offer18 Command Center</div>
          <div className="text-white/60 mt-2">Secure admin access</div>

          <div className="mt-8 space-y-3">
            <StatusRow label="System" value="Operational" />
            <StatusRow label="Queue Lag" value="0.3s" />
            <StatusRow label="Callback Failures" value="Low" />
            <StatusRow label="Detected IP" value="Auto (will be logged)" />
          </div>
        </div>

        <div className="text-xs text-white/50">Tip: use the command palette (⌘K) after login.</div>
      </div>

      <div className="p-10 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-white/60 text-sm mt-1">Admin / Sub-admin access</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Email / Username">
              <input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2 outline-none focus:border-white/30"
                placeholder="admin@domain.com"
                autoComplete="username"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2 outline-none focus:border-white/30"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {error && <div className="text-sm text-red-300">{error}</div>}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-white text-black py-2 font-medium disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>

          <div className="mt-4 flex justify-between text-sm text-white/70">
            <span>Password rules enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-sm font-medium">{value}</div>
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
