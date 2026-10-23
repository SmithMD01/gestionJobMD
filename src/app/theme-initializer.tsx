"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("theme");
      const theme = stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  return null;
}
