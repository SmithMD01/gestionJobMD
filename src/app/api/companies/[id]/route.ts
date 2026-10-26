import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { company, companyMember } from "@/modules/companies/schema";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";

const companyInput = z.object({ name: z.string().trim().min(1).max(120), isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = companyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escribe un nombre de empresa válido" }, { status: 400 });
  const { id } = await params;
  const membership = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, id), eq(companyMember.userId, session.user.id))).limit(1);
  if (membership.length === 0) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const [previous] = await db.select().from(company).where(eq(company.id, id));
  if (!previous) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const [updated] = await db.update(company).set({ name: parsed.data.name, isActive: parsed.data.isActive, updatedAt: new Date() })
    .where(eq(company.id, id)).returning();
  if (!updated) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const changes = [
    { label: "Nombre", before: previous.name, after: updated.name },
    { label: "Estado", before: previous.isActive, after: updated.isActive },
  ].filter(({ before, after }) => before !== after);
  await db.insert(auditEvent).values({ companyId: updated.id, actorUserId: session.user.id, entityType: "company", entityId: updated.id, entityName: updated.name, action: "company.updated", changeDetail: updatedDetail("la empresa", changes) });
  return Response.json({ company: updated });
}
