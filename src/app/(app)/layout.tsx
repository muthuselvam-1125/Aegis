import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import ServiceWorker from "@/components/ServiceWorker";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/register");
  }

  return (
    <>
      <ServiceWorker />
      <AppShell session={session}>{children}</AppShell>
    </>
  );
}
