import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { companyMember } from "@/modules/companies/schema";
import { calendarAccount, companyCalendarBinding } from "@/modules/calendar/schema";

const bindingInput = z.object({
  accountId: z.uuid().nullable(),
  isEnabled: z.boolean(),
  showCentralized: z.boolean(),
}).strict();

export async function PUT(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  const { companyId } = await params;
  const parsed = bindingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "La configuración de la empresa no es válida." }, { status: 400 });
  const [membership] = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, companyId), eq(companyMember.userId, session.user.id)));
  if (!membership) return Response.json({ error: "No perteneces a esta empresa." }, { status: 403 });
  if (parsed.data.accountId) {
    const [account] = await db.select({ id: calendarAccount.id }).from(calendarAccount)
      .where(and(eq(calendarAccount.id, parsed.data.accountId), eq(calendarAccount.userId, session.user.id), eq(calendarAccount.isActive, true)));
    if (!account) return Response.json({ error: "La cuenta seleccionada no pertenece al usuario." }, { status: 403 });
  }
  const [binding] = await db.insert(companyCalendarBinding).values({
    companyId,
    userId: session.user.id,
    accountId: parsed.data.accountId,
    isEnabled: parsed.data.isEnabled || parsed.data.showCentralized,
    showCentralized: parsed.data.showCentralized,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [companyCalendarBinding.companyId, companyCalendarBinding.userId],
    set: {
      accountId: parsed.data.accountId,
      isEnabled: parsed.data.isEnabled || parsed.data.showCentralized,
      showCentralized: parsed.data.showCentralized,
      updatedAt: new Date(),
    },
  }).returning();
  return Response.json({ binding });
}
