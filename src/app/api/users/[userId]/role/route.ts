import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { appRole, companyUserRole } from "@/modules/access/schema";
import { activeCompanyForUser } from "@/modules/companies/context";
import { companyMember } from "@/modules/companies/schema";
import { user } from "@/db/auth-schema";
import { auditEvent } from "@/modules/audit/schema";

const assignmentInput = z.object({ roleId: z.uuid().nullable() }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  const { userId } = await params;
  const parsed = assignmentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona un rol válido." }, { status: 400 });
  const company = await activeCompanyForUser(session.user.id);
  if (!company) return Response.json({ error: "Empresa no encontrada." }, { status: 404 });
  if (!company.isActive) return Response.json({ error: "La empresa está inactiva." }, { status: 409 });
  if (userId === session.user.id) return Response.json({ error: "El administrador conserva su acceso global." }, { status: 400 });

  const [target] = await db.select({ id: user.id, name: user.name, role: user.role })
    .from(user).innerJoin(companyMember, and(eq(companyMember.userId, user.id), eq(companyMember.companyId, company.id)))
    .where(eq(user.id, userId));
  if (!target) return Response.json({ error: "El usuario no pertenece a la empresa activa." }, { status: 404 });
  if (target.role === "admin") return Response.json({ error: "No se puede cambiar el rol global de administrador." }, { status: 400 });

  let roleName = "Sin rol";
  if (parsed.data.roleId) {
    const [role] = await db.select({ id: appRole.id, name: appRole.name, key: appRole.key })
      .from(appRole).where(and(eq(appRole.id, parsed.data.roleId), eq(appRole.companyId, company.id), eq(appRole.isActive, true)));
    if (!role || role.key === "admin") return Response.json({ error: "El rol seleccionado no está disponible." }, { status: 400 });
    roleName = role.name;
  }

  await db.transaction(async (tx) => {
    if (parsed.data.roleId) {
      await tx.insert(companyUserRole).values({ companyId: company.id, userId, roleId: parsed.data.roleId, assignedBy: session.user.id })
        .onConflictDoUpdate({ target: [companyUserRole.companyId, companyUserRole.userId], set: { roleId: parsed.data.roleId, assignedBy: session.user.id, assignedAt: new Date() } });
    } else {
      await tx.delete(companyUserRole).where(and(eq(companyUserRole.companyId, company.id), eq(companyUserRole.userId, userId)));
    }
    await tx.insert(auditEvent).values({
      companyId: company.id,
      actorUserId: session.user.id,
      entityType: "user",
      entityId: null,
      entityName: target.name,
      action: "user.company_role.updated",
      changeDetail: `Rol de ${target.name} en ${company.name}: ${roleName}.`,
    });
  });

  return Response.json({ userId, roleId: parsed.data.roleId, roleName });
}
