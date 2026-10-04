"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RainBackground } from "@/components/RainBackground";
import Link from "next/link";
import { CloudLightning, Loader2, ArrowRight } from "lucide-react";
import { GoogleIcon } from "@/components/AuthShared";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign in");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-y-auto text-slate-100 font-sans">
      <RainBackground />
      
      <div className="relative z-10 w-full max-w-md my-8 p-8 sm:p-10 rounded-2xl bg-[#0B0F19]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
        
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]">
            <CloudLightning className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-semibold text-center mb-2 tracking-tight text-white">
          Welcome Back
        </h2>
        <p className="text-center text-slate-400 mb-8 text-sm font-medium">
          Access your real-time disaster dashboard.
        </p>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
            <input
              required
              type="email"
              autoComplete="off"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
            </div>
            <input
              required
              type="password"
              autoComplete="new-password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
          </div>

          {error && (
            <div className="mt-2 px-4 py-3 border border-red-500/30 bg-red-500/10 text-red-400 text-sm rounded-xl font-medium text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}

          <button
            disabled={isLoading}
            type="button"
            onClick={handleSubmit}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            {!isLoading && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-xs text-slate-500 font-semibold tracking-wider">OR</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" />
        </div>

        <GoogleSignInButton label="Continue with Google" />

        <p className="mt-6 text-center text-sm text-slate-400">
          No account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}