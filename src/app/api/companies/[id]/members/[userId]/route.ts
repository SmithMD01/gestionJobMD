
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { company, companyMember, companyTeamMember } from "@/modules/companies/schema";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";

const memberInput = z.object({ visibleInActivityAssignments: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = memberInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Configuración no válida" }, { status: 400 });
  const { id, userId } = await params;
  const actorMembership = await db.select({ companyId: companyMember.companyId }).from(companyMember)
    .where(and(eq(companyMember.companyId, id), eq(companyMember.userId, session.user.id))).limit(1);
  if (!actorMembership.length) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const [targetCompany] = await db.select({ isActive: company.isActive }).from(company).where(eq(company.id, id));
  if (!targetCompany) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  if (!targetCompany.isActive) return Response.json({ error: "La empresa está inactiva. No puedes modificar sus miembros." }, { status: 403 });
  const [member] = await db.select({ userId: companyMember.userId, name: user.name, email: user.email, role: user.role, visibleInActivityAssignments: companyMember.visibleInActivityAssignments })
    .from(companyMember)
    .innerJoin(user, eq(companyMember.userId, user.id))
    .where(and(eq(companyMember.companyId, id), eq(companyMember.userId, userId)));
  if (!member) return Response.json({ error: "Usuario no asignado a esta empresa" }, { status: 404 });
  const [updated] = await db.update(companyMember)
    .set({ visibleInActivityAssignments: parsed.data.visibleInActivityAssignments })
    .where(and(eq(companyMember.companyId, id), eq(companyMember.userId, userId)))
    .returning();
  if (!updated) return Response.json({ error: "No se pudo actualizar la configuración" }, { status: 500 });
  await db.insert(companyTeamMember).values({ companyId: id, userId: member.userId, name: member.name, email: member.email, role: member.role }).onConflictDoUpdate({
    target: [companyTeamMember.companyId, companyTeamMember.userId],
    set: { name: sql`excluded.name`, email: sql`excluded.email`, role: sql`excluded.role`, updatedAt: new Date() },
  });
  await db.insert(auditEvent).values({
    companyId: id,
    actorUserId: session.user.id,
    entityType: "company",
    entityId: id,
    entityName: member.name,
    action: "company.member.updated",
    changeDetail: updatedDetail("la visibilidad del usuario en actividades", [{ label: "Visible en asignación de actividades", before: member.visibleInActivityAssignments, after: updated.visibleInActivityAssignments }]),
  });
  return Response.json({ member: updated });
}
