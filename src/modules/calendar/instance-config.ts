import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarInstanceConfig } from "./schema";

export type CalendarSyncMode = "origin" | "disabled";

export async function getCalendarSyncMode(): Promise<CalendarSyncMode> {
  const [config] = await db.select({ syncMode: calendarInstanceConfig.syncMode })
    .from(calendarInstanceConfig).where(eq(calendarInstanceConfig.id, 1)).limit(1);
  return config?.syncMode === "disabled" ? "disabled" : "origin";
}

export async function isCalendarProviderSyncEnabled() {
  return (await getCalendarSyncMode()) === "origin";
}
