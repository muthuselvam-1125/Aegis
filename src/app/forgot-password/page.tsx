"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Beacon, WeatherBackdrop } from "@/components/AuthShared";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.devOtp) setDevOtp(data.devOtp);
      setSuccess("OTP issued. Check email (or dev banner below).");
      setStep("reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-4">
      <WeatherBackdrop />

      <div className="relative z-10 w-full max-w-[400px] bg-surface border border-line rounded-sm shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <Beacon />
          <span className="display text-lg tracking-tight">AEGIS</span>
          <span className="mono ml-auto text-[10px] text-muted tracking-wider">RECOVERY</span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Account recovery</h1>
            <p className="text-xs text-muted mt-1">Reset via 6-digit OTP.</p>
          </div>

          {error && (
            <div className="px-3 py-2 border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs rounded-sm">
              <span className="mono text-[10px] mr-2 font-bold">ERR</span>{error}
            </div>
          )}
          {success && (
            <div className="px-3 py-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs rounded-sm">
              {success}
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="mono block text-[10px] uppercase tracking-wider text-muted mb-1.5">Registered email</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-sm text-ink focus:outline-none focus:border-live transition-colors"
                />
              </div>
              <button
                type="submit" disabled={isLoading}
                className="w-full py-2.5 rounded-sm text-sm font-semibold bg-[var(--live,#22c55e)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? "Sending…" : "Request OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {devOtp && (
                <div className="px-3 py-2 border border-line bg-surface-2 mono text-xs text-muted rounded-sm">
                  [DEV] OTP: <span className="text-ink font-bold tracking-widest">{devOtp}</span>
                </div>
              )}
              <div>
                <label className="mono block text-[10px] uppercase tracking-wider text-muted mb-1.5">6-digit code</label>
                <input
                  type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 text-center text-lg tracking-[0.4em] font-mono bg-canvas border border-line rounded-sm text-ink focus:outline-none focus:border-live transition-colors"
                />
              </div>
              <div>
                <label className="mono block text-[10px] uppercase tracking-wider text-muted mb-1.5">New password</label>
                <input
                  type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-sm text-ink focus:outline-none focus:border-live transition-colors"
                />
              </div>
              <button
                type="submit" disabled={isLoading}
                className="w-full py-2.5 rounded-sm text-sm font-semibold bg-[var(--live,#22c55e)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? "Updating…" : "Reset password"}
              </button>
            </form>
          )}
        </div>

        <div className="px-4 py-3 border-t border-line bg-surface-2 text-center">
          <Link href="/login" className="text-xs text-muted hover:text-ink font-medium">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}