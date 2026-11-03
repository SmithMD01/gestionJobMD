import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { calendarAccount, calendarDestination } from "@/modules/calendar/schema";

const destinationInput = z.object({ accountId: z.uuid() }).strict();

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const parsed = destinationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona una cuenta válida." }, { status: 400 });
  const [account] = await db.select({ id: calendarAccount.id }).from(calendarAccount)
    .where(and(eq(calendarAccount.id, parsed.data.accountId), eq(calendarAccount.userId, session.user.id), eq(calendarAccount.isActive, true)));
  if (!account) return Response.json({ error: "La cuenta no pertenece al usuario o está inactiva." }, { status: 403 });
  const [destination] = await db.insert(calendarDestination).values({ userId: session.user.id, accountId: account.id, updatedAt: new Date() }).onConflictDoUpdate({
    target: calendarDestination.userId,
    set: { accountId: account.id, updatedAt: new Date() },
  }).returning();
  return Response.json({ destination });
}
