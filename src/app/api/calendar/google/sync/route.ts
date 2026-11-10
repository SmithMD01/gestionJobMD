import { and, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { calendarAccount, calendarDestination, calendarEvent, calendarSyncRun, companyCalendarBinding } from "@/modules/calendar/schema";
import { isCalendarProviderSyncEnabled } from "@/modules/calendar/instance-config";
import { company, companyMember } from "@/modules/companies/schema";
import { hasModuleAccess } from "@/modules/access/permissions";
import { decryptSecret, getGoogleOAuthConfig, listGoogleCalendarEventsPage, refreshGoogleAccessToken, type GoogleCalendarEvent } from "@/modules/calendar/google-oauth";
import { getMicrosoftOAuthConfig, listMicrosoftCalendarEventsPage, microsoftEventDate, microsoftEventDescription, refreshMicrosoftAccessToken, type MicrosoftCalendarEvent } from "@/modules/calendar/microsoft-oauth";

const syncInput = z.object({ companyId: z.uuid(), view: z.enum(["company", "centralized"]).default("company"), trigger: z.enum(["manual", "automatic"]).default("manual") }).strict();
const pageSize = 200;

function shiftUtcMonth(source: Date, amount: number) {
  const shifted = new Date(source);
  const day = shifted.getUTCDate();
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + amount);
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  shifted.setUTCDate(Math.min(day, lastDay));
  return shifted;
}

function parseGoogleDate(value: { dateTime?: string; date?: string }) {
  if (value.dateTime) return { date: new Date(value.dateTime), allDay: false };
  if (value.date) return { date: new Date(`${value.date}T00:00:00-05:00`), allDay: true };
  return null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!await isCalendarProviderSyncEnabled()) return Response.json({ error: "Las consultas a proveedores están desactivadas en esta instalación." }, { status: 409 });
  const parsed = syncInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona una empresa válida." }, { status: 400 });

  const { companyId, view, trigger } = parsed.data;
  const permissionKey = view === "centralized" ? "calendar.centralized" : "calendar";
  const canAccess = await hasModuleAccess(session.user.id, companyId, permissionKey, session.user.role);
  if (!canAccess) return Response.json({ error: "No tienes acceso a este calendario." }, { status: 403 });
  const [membership] = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, companyId), eq(companyMember.userId, session.user.id))).limit(1);
  if (!membership) return Response.json({ error: "No perteneces a esta empresa." }, { status: 403 });
  if (view === "centralized") {
    const [activeBinding] = await db.select({ showCentralized: companyCalendarBinding.showCentralized }).from(companyCalendarBinding)
      .where(and(eq(companyCalendarBinding.companyId, companyId), eq(companyCalendarBinding.userId, session.user.id))).limit(1);
    if (!activeBinding?.showCentralized) return Response.json({ error: "La vista centralizada no está habilitada en esta empresa." }, { status: 403 });
  }

  const now = new Date();
  const windowStart = shiftUtcMonth(now, -1);
  const windowEnd = shiftUtcMonth(now, 1);
  let targets: Array<{ companyId: string; companyName: string; accountId: string | null; centralizedSource?: boolean }>;
  if (view === "centralized") {
    const selected = await db.select({ companyId: companyCalendarBinding.companyId, companyName: company.name, accountId: companyCalendarBinding.accountId })
      .from(companyCalendarBinding)
      .innerJoin(company, eq(companyCalendarBinding.companyId, company.id))
      .where(and(eq(companyCalendarBinding.userId, session.user.id), eq(companyCalendarBinding.isEnabled, true)));
    const memberships = await db.select({ companyId: companyMember.companyId }).from(companyMember).where(eq(companyMember.userId, session.user.id));
    const memberIds = new Set(memberships.map((item) => item.companyId));
    const accessibleIds = new Set((await Promise.all(selected.filter((item) => memberIds.has(item.companyId)).map(async (item) =>
      await hasModuleAccess(session.user.id, item.companyId, "calendar", session.user.role) ? item.companyId : null,
    ))).filter((id): id is string => !!id));
    targets = selected.filter((item) => accessibleIds.has(item.companyId));
    const [destination] = await db.select({ accountId: calendarDestination.accountId, label: calendarAccount.label })
      .from(calendarDestination).innerJoin(calendarAccount, eq(calendarDestination.accountId, calendarAccount.id))
      .where(and(eq(calendarDestination.userId, session.user.id), eq(calendarAccount.userId, session.user.id))).limit(1);
    if (destination?.accountId && !targets.some((target) => target.accountId === destination.accountId)) {
      targets.push({ companyId, companyName: `Cuenta centralizada · ${destination.label}`, accountId: destination.accountId, centralizedSource: true });
    }
  } else {
    const [binding] = await db.select({ accountId: companyCalendarBinding.accountId, isEnabled: companyCalendarBinding.isEnabled, companyName: company.name })
      .from(companyCalendarBinding).innerJoin(company, eq(companyCalendarBinding.companyId, company.id))
      .where(and(eq(companyCalendarBinding.companyId, companyId), eq(companyCalendarBinding.userId, session.user.id))).limit(1);
    targets = binding?.isEnabled ? [{ companyId, companyName: binding.companyName, accountId: binding.accountId }] : [];
  }
  if (targets.length === 0) return Response.json({ error: view === "centralized" ? "No hay empresas centralizadas con el calendario habilitado." : "Habilita el calendario de esta empresa en la configuración." }, { status: 400 });

  const results: Array<{ companyId: string; companyName: string; accountId: string | null; status: "success" | "error"; apiRequests: number; fetchedEvents: number; removedEvents: number; errorMessage: string | null }> = [];
  const skipped: Array<{ companyId: string; companyName: string; accountId: string | null; reason: string }> = [];
  for (const target of targets) {
    const [account] = target.accountId ? await db.select({ id: calendarAccount.id, provider: calendarAccount.provider, isActive: calendarAccount.isActive, refreshTokenEncrypted: calendarAccount.refreshTokenEncrypted, status: calendarAccount.status })
      .from(calendarAccount)
      .where(and(eq(calendarAccount.id, target.accountId), eq(calendarAccount.userId, session.user.id))).limit(1) : [];
    if (!target.accountId) {
      if (view === "centralized") {
        skipped.push({ companyId: target.companyId, companyName: target.companyName, accountId: null, reason: "No tiene una cuenta origen seleccionada." });
        continue;
      }
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: null, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: "No tiene una cuenta origen seleccionada." });
      continue;
    }
    if (!account) {
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: "La cuenta origen asignada no existe." });
      continue;
    }
    if (!account.isActive) {
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: "La cuenta origen está desactivada." });
      continue;
    }
    if (account.provider !== "google" && account.provider !== "microsoft") {
      if (view === "centralized") {
        skipped.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, reason: "El proveedor todavía no está integrado para sincronización." });
        continue;
      }
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: "La sincronización de Outlook u otras cuentas todavía no está disponible." });
      continue;
    }
    if (!account.refreshTokenEncrypted || account.status !== "connected") {
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: `La cuenta ${account.provider === "microsoft" ? "Microsoft" : "Google"} aún no está conectada mediante OAuth.` });
      continue;
    }

    const googleConfig = account.provider === "google" ? getGoogleOAuthConfig() : null;
    const microsoftConfig = account.provider === "microsoft" ? getMicrosoftOAuthConfig() : null;
    if (!googleConfig && !microsoftConfig) {
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: target.accountId, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: `Falta configurar OAuth de ${account.provider === "microsoft" ? "Microsoft" : "Google"} o la clave de cifrado en el servidor.` });
      continue;
    }

    const [run] = await db.insert(calendarSyncRun).values({ userId: session.user.id, companyId: target.companyId, accountId: account.id, trigger, status: "running", windowStart, windowEnd }).returning({ id: calendarSyncRun.id });
    if (!run) {
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: account.id, status: "error", apiRequests: 0, fetchedEvents: 0, removedEvents: 0, errorMessage: "No se pudo iniciar la sincronización." });
      continue;
    }

    let apiRequests = 0;
    let fetchedEvents = 0;
    try {
      let liveEvents: Array<typeof calendarEvent.$inferInsert>;
      let cancelledExternalEventIds: string[] = [];
      if (account.provider === "google" && googleConfig) {
        const refreshToken = decryptSecret(account.refreshTokenEncrypted, googleConfig.tokenKey);
        const accessToken = await refreshGoogleAccessToken(refreshToken, googleConfig);
        const fetched: GoogleCalendarEvent[] = [];
        let pageToken: string | undefined;
        do {
          apiRequests += 1;
          const page = await listGoogleCalendarEventsPage(accessToken, { timeMin: windowStart.toISOString(), timeMax: windowEnd.toISOString(), pageToken });
          fetched.push(...page.items);
          pageToken = page.nextPageToken;
        } while (pageToken);
        fetchedEvents = fetched.length;
        cancelledExternalEventIds = fetched.filter((event) => event.status === "cancelled").map((event) => event.id);
        liveEvents = fetched.filter((event) => event.status !== "cancelled").flatMap((event) => {
          const start = event.start ? parseGoogleDate(event.start) : null;
          const end = event.end ? parseGoogleDate(event.end) : null;
          if (!start || !end || !Number.isFinite(start.date.getTime()) || !Number.isFinite(end.date.getTime()) || end.date <= start.date) return [];
          const participants = (event.attendees ?? []).flatMap((attendee) => {
            const name = attendee.displayName?.trim() || null;
            const email = attendee.email?.trim() || null;
            return name || email ? [{ name, email, responseStatus: attendee.responseStatus ?? null, organizer: attendee.organizer ?? false }] : [];
          });
          return [{ userId: session.user.id, companyId: target.companyId, title: event.summary?.trim() || "(Sin título)", description: event.description ?? "", participants: JSON.stringify(participants), startsAt: start.date, endsAt: end.date, timezone: "America/Lima", allDay: start.allDay && end.allDay, sourceAccountId: account.id, externalCalendarId: "primary", externalEventId: event.id, syncStatus: "synced", updatedAt: new Date() }];
        });
      } else if (account.provider === "microsoft" && microsoftConfig) {
        const refreshed = await refreshMicrosoftAccessToken(account.refreshTokenEncrypted, microsoftConfig);
        const accessToken = refreshed.accessToken;
        if (refreshed.encryptedRefreshToken !== account.refreshTokenEncrypted) {
          await db.update(calendarAccount).set({ refreshTokenEncrypted: refreshed.encryptedRefreshToken, tokenExpiresAt: refreshed.expiresAt, updatedAt: new Date() }).where(eq(calendarAccount.id, account.id));
        }
        const fetched: MicrosoftCalendarEvent[] = [];
        let nextLink: string | undefined;
        do {
          apiRequests += 1;
          const page = await listMicrosoftCalendarEventsPage(accessToken, { timeMin: windowStart.toISOString(), timeMax: windowEnd.toISOString(), nextLink });
          fetched.push(...page.items);
          nextLink = page.nextLink;
        } while (nextLink);
        fetchedEvents = fetched.length;
        cancelledExternalEventIds = fetched.filter((event) => event.isCancelled).map((event) => event.id);
        liveEvents = fetched.filter((event) => !event.isCancelled).flatMap((event) => {
          const startsAt = microsoftEventDate(event.start);
          const endsAt = microsoftEventDate(event.end);
          if (!startsAt || !endsAt || endsAt <= startsAt) return [];
          const participants = (event.attendees ?? []).flatMap((attendee) => {
            const name = attendee.emailAddress?.name?.trim() || null;
            const email = attendee.emailAddress?.address?.trim() || null;
            return name || email ? [{ name, email, responseStatus: attendee.status?.response ?? null, organizer: false }] : [];
          });
          const organizer = event.organizer?.emailAddress;
          if (organizer?.address && !participants.some((participant) => participant.email?.toLowerCase() === organizer.address?.toLowerCase())) {
            participants.push({ name: organizer.name?.trim() || null, email: organizer.address, responseStatus: null, organizer: true });
          }
          return [{ userId: session.user.id, companyId: target.companyId, title: event.subject?.trim() || "(Sin título)", description: microsoftEventDescription(event), participants: JSON.stringify(participants), startsAt, endsAt, timezone: "America/Lima", allDay: event.isAllDay ?? false, sourceAccountId: account.id, externalCalendarId: "primary", externalEventId: event.id, syncStatus: "synced", updatedAt: new Date() }];
        });
      } else {
        throw new Error("No se pudo configurar el proveedor de calendario.");
      }

      let removedEvents = 0;
      await db.transaction(async (tx) => {
        const existingFilters = [
          eq(calendarEvent.userId, session.user.id),
          ...(target.centralizedSource ? [] : [eq(calendarEvent.companyId, target.companyId)]),
          eq(calendarEvent.sourceAccountId, account.id),
          isNotNull(calendarEvent.externalEventId),
          gt(calendarEvent.endsAt, windowStart),
          lt(calendarEvent.startsAt, windowEnd),
        ];
        const existing = await tx.select({ id: calendarEvent.id, externalEventId: calendarEvent.externalEventId }).from(calendarEvent)
          .where(and(...existingFilters));
        const retainedIds = new Set([...liveEvents.map((event) => event.externalEventId), ...cancelledExternalEventIds]);
        const staleIds = existing.filter((event) => !event.externalEventId || !retainedIds.has(event.externalEventId)).map((event) => event.id);
        for (let index = 0; index < liveEvents.length; index += pageSize) {
          await tx.insert(calendarEvent).values(liveEvents.slice(index, index + pageSize)).onConflictDoUpdate({
            target: [calendarEvent.sourceAccountId, calendarEvent.externalCalendarId, calendarEvent.externalEventId],
            set: { companyId: target.companyId, title: sql`excluded.title`, description: sql`excluded.description`, participants: sql`excluded.participants`, startsAt: sql`excluded.starts_at`, endsAt: sql`excluded.ends_at`, timezone: sql`excluded.timezone`, allDay: sql`excluded.all_day`, syncStatus: sql`excluded.sync_status`, updatedAt: new Date() },
          });
        }
        if (cancelledExternalEventIds.length) {
          await tx.update(calendarEvent).set({ syncStatus: "cancelled", updatedAt: new Date() }).where(and(...existingFilters, inArray(calendarEvent.externalEventId, cancelledExternalEventIds)));
        }
        if (staleIds.length) {
          await tx.delete(calendarEvent).where(inArray(calendarEvent.id, staleIds));
          removedEvents = staleIds.length;
        }
      });
      await db.update(calendarSyncRun).set({ status: "success", apiRequests, fetchedEvents, removedEvents, finishedAt: new Date() }).where(eq(calendarSyncRun.id, run.id));
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: account.id, status: "success", apiRequests, fetchedEvents, removedEvents, errorMessage: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo sincronizar Google Calendar.";
      await db.update(calendarSyncRun).set({ status: "error", apiRequests, errorMessage, finishedAt: new Date() }).where(eq(calendarSyncRun.id, run.id));
      results.push({ companyId: target.companyId, companyName: target.companyName, accountId: account.id, status: "error", apiRequests, fetchedEvents: 0, removedEvents: 0, errorMessage });
    }
  }

  const succeeded = results.filter((result) => result.status === "success");
  const failed = results.filter((result) => result.status === "error");
  const status = failed.length === 0 && skipped.length === 0 ? "success" : succeeded.length === 0 && skipped.length === 0 ? "error" : "partial";
  const summary = {
    id: `sync-${Date.now()}`,
    status,
    windowStart,
    windowEnd,
    apiRequests: results.reduce((total, result) => total + result.apiRequests, 0),
    fetchedEvents: results.reduce((total, result) => total + result.fetchedEvents, 0),
    removedEvents: results.reduce((total, result) => total + result.removedEvents, 0),
    accountCount: new Set(succeeded.map((result) => result.accountId)).size,
    companyCount: new Set(succeeded.map((result) => result.companyId)).size,
    errorMessage: failed.map((result) => `${result.companyName}: ${result.errorMessage}`).filter(Boolean).join(" ") || null,
    skippedCount: skipped.length,
    startedAt: now,
    finishedAt: new Date(),
  };
  return Response.json({ run: summary, results, skipped, ...(status === "error" ? { error: summary.errorMessage ?? "No se pudo sincronizar Google Calendar." } : {}) }, { status: status === "error" ? 502 : 200 });
}
