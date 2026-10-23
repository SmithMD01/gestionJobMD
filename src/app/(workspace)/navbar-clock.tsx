"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 10_000);
  return () => window.clearInterval(timer);
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000);
}

export function NavbarClock() {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);
  const day = now ? new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(now).replace(".", "").toUpperCase() : "--";
  const hours = now ? String(now.getHours()).padStart(2, "0") : "--";
  const minutes = now ? String(now.getMinutes()).padStart(2, "0") : "--";

  return (
    <time dateTime={now?.toISOString()} aria-label={now ? new Intl.DateTimeFormat("es-PE", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(now) : "Cargando hora"} className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface px-3 text-xs font-medium tabular-nums text-ink shadow-sm">
      <span>{day}</span><span aria-hidden="true" className="text-subtle">·</span><span>{hours}:{minutes}</span>
    </time>
  );
}
