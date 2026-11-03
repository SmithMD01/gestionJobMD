import { and, asc, desc, eq, gte, isNull, or, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireReadySession } from "@/lib/require-session";
import { db } from "@/db/client";
import { activeCompanyForPage } from "@/modules/companies/context";
import { hasModuleAccess } from "@/modules/access/permissions";
import { calendarAccount, calendarEvent, calendarSyncRun, companyCalendarBinding } from "@/modules/calendar/schema";
import { company } from "@/modules/companies/schema";
import { parseCalendarParticipants } from "@/modules/calendar/participants";
import { CalendarPanel, type CalendarEventRow } from "./calendar-panel";

export default async function CalendarPage() {
  const session = await requireReadySession();
  const activeCompany = await activeCompanyForPage(session.user.id);
  const canAccess = await hasModuleAccess(session.user.id, activeCompany.id, "calendar", session.user.role);
  if (!canAccess) notFound();
  const [[binding], canCentralized] = await Promise.all([
    db.select({ showCentralized: companyCalendarBinding.showCentralized, accountId: companyCalendarBinding.accountId, isEnabled: companyCalendarBinding.isEnabled }).from(companyCalendarBinding)
      .where(and(eq(companyCalendarBinding.companyId, activeCompany.id), eq(companyCalendarBinding.userId, session.user.id))),
    hasModuleAccess(session.user.id, activeCompany.id, "calendar.centralized", session.user.role),
  ]);
  const activeSourceId = binding?.isEnabled ? binding.accountId : null;
  const eventSourceFilter = activeSourceId ? or(isNull(calendarEvent.sourceAccountId), eq(calendarEvent.sourceAccountId, activeSourceId)) : isNull(calendarEvent.sourceAccountId);
  const events = await db.select({ id: calendarEvent.id, companyId: calendarEvent.companyId, companyName: company.name, sourceAccountId: calendarEvent.sourceAccountId, sourceAccountLabel: calendarAccount.label, sourceAccountEmail: calendarAccount.email, title: calendarEvent.title, description: calendarEvent.description, participants: calendarEvent.participants, startsAt: calendarEvent.startsAt, endsAt: calendarEvent.endsAt, timezone: calendarEvent.timezone, allDay: calendarEvent.allDay, syncStatus: calendarEvent.syncStatus })
    .from(calendarEvent).innerJoin(company, eq(calendarEvent.companyId, company.id)).leftJoin(calendarAccount, eq(calendarEvent.sourceAccountId, calendarAccount.id))
    .where(and(eq(calendarEvent.userId, session.user.id), eq(calendarEvent.companyId, activeCompany.id), eventSourceFilter))
    .orderBy(asc(calendarEvent.startsAt));
  const [sourceAccount] = binding?.accountId ? await db.select({ id: calendarAccount.id, label: calendarAccount.label, email: calendarAccount.email, isConnected: calendarAccount.status, isActive: calendarAccount.isActive })
    .from(calendarAccount).where(and(eq(calendarAccount.id, binding.accountId), eq(calendarAccount.userId, session.user.id))).limit(1) : [];
  const limaDayParts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const limaDay = Object.fromEntries(limaDayParts.map((part) => [part.type, part.value]));
  const limaDayStart = new Date(`${limaDay.year}-${limaDay.month}-${limaDay.day}T00:00:00-05:00`);
  const [lastRun] = binding?.accountId ? await db.select({ id: calendarSyncRun.id, status: calendarSyncRun.status, windowStart: calendarSyncRun.windowStart, windowEnd: calendarSyncRun.windowEnd, apiRequests: calendarSyncRun.apiRequests, fetchedEvents: calendarSyncRun.fetchedEvents, removedEvents: calendarSyncRun.removedEvents, errorMessage: calendarSyncRun.errorMessage, startedAt: calendarSyncRun.startedAt, finishedAt: calendarSyncRun.finishedAt })
    .from(calendarSyncRun)
    .where(and(eq(calendarSyncRun.userId, session.user.id), eq(calendarSyncRun.companyId, activeCompany.id), eq(calendarSyncRun.accountId, binding.accountId)))
    .orderBy(desc(calendarSyncRun.startedAt)).limit(1) : [];
  const [usage] = await db.select({ requests: sum(calendarSyncRun.apiRequests) })
    .from(calendarSyncRun).where(and(eq(calendarSyncRun.userId, session.user.id), gte(calendarSyncRun.startedAt, limaDayStart)));
  const initialEvents: CalendarEventRow[] = events.map((event) => ({ ...event, sourceAccountLabel: event.sourceAccountId ? `${event.sourceAccountLabel ?? "Cuenta de calendario"} · ${event.sourceAccountEmail ?? ""}`.trim() : null, participants: parseCalendarParticipants(event.participants), startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString() }));
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <CalendarPanel companyId={activeCompany.id} companyName={activeCompany.name} initialEvents={initialEvents} centralizedEnabled={!!binding?.showCentralized && canCentralized} sourceAccountLabel={sourceAccount ? `${sourceAccount.label} · ${sourceAccount.email}` : null} sourceAccountConnected={!!binding?.isEnabled && sourceAccount?.isConnected === "connected" && sourceAccount.isActive} initialLastSync={lastRun ? { ...lastRun, windowStart: lastRun.windowStart.toISOString(), windowEnd: lastRun.windowEnd.toISOString(), startedAt: lastRun.startedAt.toISOString(), finishedAt: lastRun.finishedAt?.toISOString() ?? null } : null} initialDailyApiRequests={Number(usage?.requests ?? 0)} />
    </main>
  );
}
