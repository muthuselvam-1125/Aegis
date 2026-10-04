"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function TestSMSPage() {
  const [phone, setPhone] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/alerts/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Send className="text-blue-500" /> Test Offline SMS Alert
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Send a fake disaster alert directly to any phone via Pushbullet integration. The receiver will get an offline SMS.
        </p>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
              Phone Number (with country code)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send SMS Alert Now"}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-xl border text-sm ${result.data?.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
