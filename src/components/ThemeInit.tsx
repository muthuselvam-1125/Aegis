"use client";

import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("aegis:prefs");
      const p = raw ? JSON.parse(raw) : {};
      const d = document.documentElement;
      const dark =
        p.theme === "dark" ||
        (p.theme !== "light" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (dark) d.classList.add("dark");
      else d.classList.remove("dark");
      if (p.textScale) d.style.setProperty("--text-scale", String(p.textScale));
      if (p.reducedMotion) d.setAttribute("data-reduced-motion", "true");
      if (p.dir) d.setAttribute("dir", p.dir);
    } catch {}
  }, []);

  return null;
}
