import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { calendarInstanceConfig } from "@/modules/calendar/schema";
import { getCalendarSyncMode } from "@/modules/calendar/instance-config";

const inputSchema = z.object({ syncMode: z.enum(["origin", "disabled"]) }).strict();

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) return Response.json({ error: "No autorizado" }, { status: 403 });
  return Response.json({ syncMode: await getCalendarSyncMode() });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) return Response.json({ error: "No autorizado" }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona un modo de sincronización válido." }, { status: 400 });

  await db.insert(calendarInstanceConfig).values({ id: 1, syncMode: parsed.data.syncMode, updatedBy: session.user.id, updatedAt: new Date() })
    .onConflictDoUpdate({ target: calendarInstanceConfig.id, set: { syncMode: parsed.data.syncMode, updatedBy: session.user.id, updatedAt: new Date() } });
  const [config] = await db.select({ syncMode: calendarInstanceConfig.syncMode, updatedAt: calendarInstanceConfig.updatedAt })
    .from(calendarInstanceConfig).where(eq(calendarInstanceConfig.id, 1)).limit(1);
  return Response.json({ syncMode: config?.syncMode ?? parsed.data.syncMode, updatedAt: config?.updatedAt ?? new Date() });
}
