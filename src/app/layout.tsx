import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const plexMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEGIS · Weather & Disaster Management Platform",
  description:
    "Life-safety disaster management and daily weather intelligence platform grounded in official agency data and ensemble models.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AEGIS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} antialiased`}
      >
        <ThemeInit />
        {children}
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
