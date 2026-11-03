"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 20 * 60 * 1000;

export function CalendarSyncAgent({ userId, companyId, view, enabled }: { userId: string; companyId: string; view: "company" | "centralized"; enabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    // A company view has a different source account per company. The centralized
    // view is user-wide, so it intentionally shares one cooldown across companies.
    const storageKey = `calendar-auto-sync:${userId}:${view}:${view === "company" ? companyId : "central"}`;
    let syncing = false;

    async function syncIfDue() {
      if (syncing || document.visibilityState === "hidden") return;
      const lastAttempt = Number(window.localStorage.getItem(storageKey) ?? 0);
      if (Date.now() - lastAttempt < SYNC_INTERVAL_MS) return;

      syncing = true;
      window.localStorage.setItem(storageKey, String(Date.now()));
      try {
        const response = await fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyId, view, trigger: "automatic" }),
        });
        if (response.ok && (pathname === "/calendar" || pathname === "/calendar-monitor")) router.refresh();
      } catch {
        // Leave the attempt timestamp in place to avoid hammering a provider during an outage.
      } finally {
        syncing = false;
      }
    }

    void syncIfDue();
    const interval = window.setInterval(() => void syncIfDue(), SYNC_INTERVAL_MS);
    const onFocus = () => void syncIfDue();
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void syncIfDue(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [companyId, enabled, pathname, router, userId, view]);

  return null;
}
