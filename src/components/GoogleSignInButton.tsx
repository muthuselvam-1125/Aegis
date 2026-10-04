"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleIcon } from "@/components/AuthShared";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "208277726841-ut4he9ara5fh0ueamg5a7iidbujoiolp.apps.googleusercontent.com";

  useEffect(() => {
    // The script is now loaded globally via next/script in layout.tsx
  }, []);

  const handleGoogleLogin = () => {
    setError("");
    setLoading(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userInfoRes.json();

                const res = await fetch("/api/auth/google", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: userInfo.email,
                    name: userInfo.name,
                    avatarUrl: userInfo.picture,
                  }),
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Google sign-in failed");
                
                if (data.isNewUser && typeof window !== "undefined") {
                  localStorage.setItem("aegis:location_setup_needed", "true");
                }
                
                router.push("/");
                router.refresh();
              } catch (err: any) {
                setError(err.message || "Failed to authenticate with Google");
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          },
          error_callback: () => {
            setError("Google sign-in cancelled or failed");
            setLoading(false);
          },
        });
        
        client.requestAccessToken();
      } catch (e) {
        setError("Failed to initialize Google Sign-in");
        setLoading(false);
      }
    } else {
      setError("Google Sign-in is not loaded yet. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-400 text-xs rounded-xl font-medium text-center">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleGoogleLogin}
        className="w-full py-3 rounded-xl text-sm font-medium border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        <span>{loading ? "Connecting to Google..." : label}</span>
      </button>
    </div>
  );
}
