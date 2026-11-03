import { and, count, desc, eq, gte, ne, sum } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { calendarAccount, calendarSyncRun } from "@/modules/calendar/schema";
import { company } from "@/modules/companies/schema";
import { user } from "@/db/auth-schema";
import { CalendarMonitorPanel, type CalendarSyncMonitorRow } from "./panel";

function limaDayStart(now: Date) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${date.year}-${date.month}-${date.day}T00:00:00-05:00`);
}

export default async function CalendarMonitorPage() {
  await requireAdmin();
  const now = new Date();
  const todayStart = limaDayStart(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [totals, googleRequests, errors, [lastAutomatic], runs] = await Promise.all([
    db.select({ executions: count() }).from(calendarSyncRun).where(gte(calendarSyncRun.startedAt, todayStart)),
    db.select({ requests: sum(calendarSyncRun.apiRequests) }).from(calendarSyncRun)
      .innerJoin(calendarAccount, eq(calendarSyncRun.accountId, calendarAccount.id))
      .where(and(gte(calendarSyncRun.startedAt, todayStart), eq(calendarAccount.provider, "google"))),
    db.select({ executions: count() }).from(calendarSyncRun)
      .where(and(gte(calendarSyncRun.startedAt, todayStart), ne(calendarSyncRun.status, "success"))),
    db.select({ startedAt: calendarSyncRun.startedAt }).from(calendarSyncRun)
      .where(eq(calendarSyncRun.trigger, "automatic")).orderBy(desc(calendarSyncRun.startedAt)).limit(1),
    db.select({ id: calendarSyncRun.id, userId: calendarSyncRun.userId, userName: user.name, companyName: company.name, accountLabel: calendarAccount.label, accountEmail: calendarAccount.email, provider: calendarAccount.provider, trigger: calendarSyncRun.trigger, status: calendarSyncRun.status, apiRequests: calendarSyncRun.apiRequests, fetchedEvents: calendarSyncRun.fetchedEvents, removedEvents: calendarSyncRun.removedEvents, errorMessage: calendarSyncRun.errorMessage, startedAt: calendarSyncRun.startedAt, finishedAt: calendarSyncRun.finishedAt })
      .from(calendarSyncRun).innerJoin(user, eq(calendarSyncRun.userId, user.id)).innerJoin(company, eq(calendarSyncRun.companyId, company.id)).innerJoin(calendarAccount, eq(calendarSyncRun.accountId, calendarAccount.id))
      .where(gte(calendarSyncRun.startedAt, thirtyDaysAgo)).orderBy(desc(calendarSyncRun.startedAt)).limit(500),
  ]);
  const rows: CalendarSyncMonitorRow[] = runs.map((run) => ({ ...run, startedAt: run.startedAt.toISOString(), finishedAt: run.finishedAt?.toISOString() ?? null }));
  return <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8"><CalendarMonitorPanel rows={rows} googleRequestsToday={Number(googleRequests[0]?.requests ?? 0)} executionsToday={totals[0]?.executions ?? 0} errorsToday={errors[0]?.executions ?? 0} lastAutomaticRun={lastAutomatic?.startedAt.toISOString() ?? null} /></main>;
}
