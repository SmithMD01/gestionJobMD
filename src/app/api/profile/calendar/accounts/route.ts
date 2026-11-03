import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { calendarAccount } from "@/modules/calendar/schema";

const accountInput = z.object({
  provider: z.enum(["google", "microsoft", "other"]),
  label: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
}).strict();

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const accounts = await db.select({ id: calendarAccount.id, provider: calendarAccount.provider, label: calendarAccount.label, email: calendarAccount.email, status: calendarAccount.status, isActive: calendarAccount.isActive })
    .from(calendarAccount)
    .where(eq(calendarAccount.userId, session.user.id))
    .orderBy(asc(calendarAccount.label));
  return Response.json({ accounts });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const parsed = accountInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Completa un proveedor, nombre y correo válidos." }, { status: 400 });
  const [account] = await db.insert(calendarAccount).values({ userId: session.user.id, ...parsed.data, email: parsed.data.email.toLowerCase(), status: "manual" })
    .returning({ id: calendarAccount.id, provider: calendarAccount.provider, label: calendarAccount.label, email: calendarAccount.email, status: calendarAccount.status, isActive: calendarAccount.isActive });
  if (!account) return Response.json({ error: "No se pudo registrar la cuenta." }, { status: 500 });
  return Response.json({ account }, { status: 201 });
}
