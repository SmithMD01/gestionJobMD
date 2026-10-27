import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { company, companyMember, companyTeamMember } from "@/modules/companies/schema";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";

const companyInput = z.object({ name: z.string().trim().min(1).max(120), isActive: z.boolean(), memberIds: z.array(z.string().min(1)).max(500).default([]) });

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
  const memberIds = [...new Set([session.user.id, ...parsed.data.memberIds])];
  const existingUsers = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).where(inArray(user.id, memberIds));
  if (existingUsers.length !== memberIds.length) return Response.json({ error: "Uno o más usuarios seleccionados no existen" }, { status: 400 });
  const previousMembers = await db.select({ userId: user.id, name: user.name, visibleInActivityAssignments: companyMember.visibleInActivityAssignments }).from(companyMember)
    .innerJoin(user, eq(companyMember.userId, user.id)).where(eq(companyMember.companyId, id));
  const previousVisibility = new Map(previousMembers.map((member) => [member.userId, member.visibleInActivityAssignments]));
  const [updated] = await db.transaction(async (tx) => {
    const [result] = await tx.update(company).set({ name: parsed.data.name, isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(company.id, id)).returning();
    if (!result) return [];
    await tx.delete(companyMember).where(eq(companyMember.companyId, id));
    await tx.insert(companyMember).values(memberIds.map((userId) => ({ companyId: id, userId, visibleInActivityAssignments: previousVisibility.get(userId) ?? false })));
    await tx.insert(companyTeamMember).values(existingUsers.map((member) => ({ companyId: id, userId: member.id, name: member.name, email: member.email, role: member.role }))).onConflictDoUpdate({
      target: [companyTeamMember.companyId, companyTeamMember.userId],
      set: { name: sql`excluded.name`, email: sql`excluded.email`, role: sql`excluded.role`, updatedAt: new Date() },
    });
    return [result];
  });
  if (!updated) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const changes = [
    { label: "Nombre", before: previous.name, after: updated.name },
    { label: "Estado", before: previous.isActive, after: updated.isActive },
    { label: "Usuarios asignados", before: previousMembers.map((member) => member.name).sort().join(", "), after: existingUsers.map((member) => member.name).sort().join(", ") },
  ].filter(({ before, after }) => before !== after);
  await db.insert(auditEvent).values({ companyId: updated.id, actorUserId: session.user.id, entityType: "company", entityId: updated.id, entityName: updated.name, action: "company.updated", changeDetail: updatedDetail("la empresa", changes) });
  return Response.json({ company: updated });
}
