"use client";

import { useSyncExternalStore } from "react";
import { UiIcon } from "./ui-icon";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== "theme") return;
    if (event.newValue === "light" || event.newValue === "dark") {
      document.documentElement.dataset.theme = event.newValue;
      callback();
    }
  }
  window.addEventListener("themechange", callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("themechange", callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ compact = false, sidebar = false }: { compact?: boolean; sidebar?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem("theme", next); } catch { /* The switch still works for this page. */ }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      aria-pressed={theme === "dark"}
      title={compact ? theme === "dark" ? "Modo claro" : "Modo oscuro" : undefined}
      className={compact ? "ui-theme-toggle" : sidebar ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-hover hover:text-ink" : "rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-hover"}
    >
      {compact && <span className="ui-theme-toggle-outer"><span className="ui-theme-toggle-inner"><UiIcon name={theme === "dark" ? "sun" : "moon"} /></span></span>}
      {!compact && sidebar && <UiIcon name={theme === "dark" ? "sun" : "moon"} />}
      {!compact && (theme === "dark" ? "Modo claro" : "Modo oscuro")}
    </button>
  );
}
