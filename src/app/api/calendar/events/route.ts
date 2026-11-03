import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { company, companyMember } from "@/modules/companies/schema";
import { calendarAccount, calendarDestination, calendarEvent, companyCalendarBinding } from "@/modules/calendar/schema";
import { hasModuleAccess } from "@/modules/access/permissions";
import { parseCalendarParticipants } from "@/modules/calendar/participants";

const eventInput = z.object({
  companyId: z.uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).default(""),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  sourceAccountId: z.uuid().nullable().default(null),
}).strict();

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const companyId = query.get("companyId");
  const view = query.get("view") === "centralized" ? "centralized" : "company";
  if (!companyId) return Response.json({ error: "Selecciona una empresa." }, { status: 400 });
  const canAccess = await hasModuleAccess(session.user.id, companyId, view === "centralized" ? "calendar.centralized" : "calendar", session.user.role);
  if (!canAccess) return Response.json({ error: "No tienes acceso a esta vista del calendario." }, { status: 403 });
  const [membership] = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, companyId), eq(companyMember.userId, session.user.id)));
  if (!membership) return Response.json({ error: "No perteneces a esta empresa." }, { status: 403 });
  if (view === "centralized") {
    const [binding] = await db.select({ showCentralized: companyCalendarBinding.showCentralized }).from(companyCalendarBinding)
      .where(and(eq(companyCalendarBinding.companyId, companyId), eq(companyCalendarBinding.userId, session.user.id)));
    if (!binding?.showCentralized) return Response.json({ error: "La vista centralizada no está habilitada en esta empresa." }, { status: 403 });
  }
  const selectedCentralizedCompanies = view === "centralized" ? await db.select({ companyId: companyCalendarBinding.companyId, accountId: companyCalendarBinding.accountId })
    .from(companyCalendarBinding)
    .innerJoin(companyMember, and(eq(companyMember.companyId, companyCalendarBinding.companyId), eq(companyMember.userId, session.user.id)))
    .where(and(eq(companyCalendarBinding.userId, session.user.id), eq(companyCalendarBinding.isEnabled, true))) : [];
  const centralizedBindings = view === "centralized" ? (await Promise.all(selectedCentralizedCompanies.map(async (item) =>
    await hasModuleAccess(session.user.id, item.companyId, "calendar", session.user.role) ? item : null,
  ))).filter((item): item is NonNullable<typeof item> => !!item) : [];
  const [centralDestination] = view === "centralized" ? await db.select({ accountId: calendarDestination.accountId })
    .from(calendarDestination).where(eq(calendarDestination.userId, session.user.id)).limit(1) : [];
  if (view === "centralized" && centralizedBindings.length === 0 && !centralDestination?.accountId) return Response.json({ events: [] });
  const centralizedEventFilters = view === "centralized" ? [
    ...(centralizedBindings.length ? [and(isNull(calendarEvent.sourceAccountId), inArray(calendarEvent.companyId, centralizedBindings.map((item) => item.companyId)))] : []),
    ...centralizedBindings.flatMap((item) => item.accountId ? [and(eq(calendarEvent.companyId, item.companyId), eq(calendarEvent.sourceAccountId, item.accountId))] : []),
    ...(centralDestination?.accountId ? [eq(calendarEvent.sourceAccountId, centralDestination.accountId)] : []),
  ] : [];
  const centralizedEventFilter = view === "centralized" ? or(...centralizedEventFilters) : undefined;
  const [activeCompanyBinding] = view === "company" ? await db.select({ accountId: companyCalendarBinding.accountId, isEnabled: companyCalendarBinding.isEnabled })
    .from(companyCalendarBinding).where(and(eq(companyCalendarBinding.companyId, companyId), eq(companyCalendarBinding.userId, session.user.id))).limit(1) : [];
  const companyEventFilter = activeCompanyBinding?.isEnabled && activeCompanyBinding.accountId
    ? or(isNull(calendarEvent.sourceAccountId), eq(calendarEvent.sourceAccountId, activeCompanyBinding.accountId))
    : isNull(calendarEvent.sourceAccountId);
  const events = await db.select({ id: calendarEvent.id, companyId: calendarEvent.companyId, companyName: company.name, sourceAccountId: calendarEvent.sourceAccountId, sourceAccountLabel: calendarAccount.label, sourceAccountEmail: calendarAccount.email, title: calendarEvent.title, description: calendarEvent.description, participants: calendarEvent.participants, startsAt: calendarEvent.startsAt, endsAt: calendarEvent.endsAt, timezone: calendarEvent.timezone, allDay: calendarEvent.allDay, syncStatus: calendarEvent.syncStatus })
    .from(calendarEvent)
    .innerJoin(company, eq(calendarEvent.companyId, company.id))
    .leftJoin(calendarAccount, eq(calendarEvent.sourceAccountId, calendarAccount.id))
    .where(view === "centralized" ? and(eq(calendarEvent.userId, session.user.id), centralizedEventFilter!) : and(eq(calendarEvent.userId, session.user.id), eq(calendarEvent.companyId, companyId), companyEventFilter))
    .orderBy(asc(calendarEvent.startsAt));
  return Response.json({ events: events.map((event) => ({ ...event, sourceAccountLabel: event.sourceAccountId ? `${event.sourceAccountLabel ?? "Cuenta de calendario"} · ${event.sourceAccountEmail ?? ""}`.trim() : null, companyName: view === "centralized" && event.sourceAccountId === centralDestination?.accountId ? event.sourceAccountLabel ?? "Cuenta centralizada" : event.companyName, participants: parseCalendarParticipants(event.participants) })) });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const parsed = eventInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) return Response.json({ error: "Revisa las fechas del evento." }, { status: 400 });
  const canAccess = await hasModuleAccess(session.user.id, parsed.data.companyId, "calendar", session.user.role);
  if (!canAccess) return Response.json({ error: "No tienes acceso a este calendario." }, { status: 403 });
  const [membership] = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, parsed.data.companyId), eq(companyMember.userId, session.user.id)));
  if (!membership) return Response.json({ error: "No perteneces a esta empresa." }, { status: 403 });
  if (parsed.data.sourceAccountId) {
    const [account] = await db.select({ id: calendarAccount.id }).from(calendarAccount)
      .where(and(eq(calendarAccount.id, parsed.data.sourceAccountId), eq(calendarAccount.userId, session.user.id), eq(calendarAccount.isActive, true)));
    if (!account) return Response.json({ error: "La cuenta origen no pertenece al usuario." }, { status: 403 });
  }
  const [destination] = await db.select({ accountId: calendarDestination.accountId }).from(calendarDestination).where(eq(calendarDestination.userId, session.user.id));
  const [event] = await db.insert(calendarEvent).values({
    userId: session.user.id,
    companyId: parsed.data.companyId,
    title: parsed.data.title,
    description: parsed.data.description,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    sourceAccountId: parsed.data.sourceAccountId,
    destinationAccountId: destination?.accountId ?? null,
    syncStatus: "pending",
  }).returning();
  return Response.json({ event }, { status: 201 });
}
