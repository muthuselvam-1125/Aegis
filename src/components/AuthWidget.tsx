"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthWidget({ session }: { session?: any }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-between px-3 py-2 rounded border border-line bg-surface-2 text-xs font-medium text-ink hover:bg-surface-2/80 transition-colors"
      >
        <span>Account & Community</span>
        <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Sign In →</span>
      </Link>
    );
  }

  const initials = session.name
    ? session.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="p-2 rounded border border-line bg-surface-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="w-7 h-7 rounded-full bg-live/10 border border-live/30 text-live flex items-center justify-center font-bold text-[11px] flex-shrink-0">
          {initials}
        </div>
        <div className="flex flex-col overflow-hidden leading-tight">
          <span className="text-xs font-semibold text-ink truncate">{session.name}</span>
          <span className="text-[10px] text-muted truncate">{session.email}</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        title="Sign Out"
        className="px-2 py-1 text-[11px] font-medium text-muted hover:text-ink hover:bg-surface rounded border border-transparent hover:border-line transition-colors flex-shrink-0"
      >
        Sign Out
      </button>
    </div>
  );
}
