import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { appRole, roleModulePermission } from "@/modules/access/schema";
import { activeCompanyForUser } from "@/modules/companies/context";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";
import { ADMIN_REQUIRED_MODULE_KEYS, MODULE_CATALOG_BY_KEY, normalizeModuleKeys, type ModulePermissionKey } from "@/modules/access/catalog";

const roleUpdateInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().default(""),
  moduleKeys: z.array(z.string()).max(100),
}).strict();

async function adminSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin" || !session.user.twoFactorEnabled) return null;
  return session;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminSession(request);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = roleUpdateInput.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Revisa el nombre y los permisos seleccionados." }, { status: 400 });
  const unknownKey = parsed.data.moduleKeys.find((key) => !(key in MODULE_CATALOG_BY_KEY));
  if (unknownKey) return Response.json({ error: "El catálogo contiene un permiso no válido." }, { status: 400 });
  const company = await activeCompanyForUser(session.user.id);
  if (!company) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const [previous] = await db.select().from(appRole).where(and(eq(appRole.id, id), eq(appRole.companyId, company.id)));
  if (!previous) return Response.json({ error: "Rol no encontrado" }, { status: 404 });

  const normalized = new Set(normalizeModuleKeys(parsed.data.moduleKeys));
  for (const key of ADMIN_REQUIRED_MODULE_KEYS) {
    if (previous.key === "admin") normalized.add(key);
  }
  const moduleKeys = [...normalized] as ModulePermissionKey[];
  const [role] = await db.transaction(async (tx) => {
    const [updated] = await tx.update(appRole).set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    }).where(and(eq(appRole.id, id), eq(appRole.companyId, company.id))).returning();
    if (!updated) return [];
    await tx.delete(roleModulePermission).where(eq(roleModulePermission.roleId, id));
    if (moduleKeys.length) {
      await tx.insert(roleModulePermission).values(moduleKeys.map((moduleKey) => ({
        roleId: id,
        moduleKey,
        canAccess: true,
        updatedBy: session.user.id,
      })));
    }
    await tx.insert(auditEvent).values({
      companyId: company.id,
      actorUserId: session.user.id,
      entityType: "role",
      entityId: updated.id,
      entityName: updated.name,
      action: "role.updated",
      changeDetail: updatedDetail("el rol", [
        { label: "Nombre", before: previous.name, after: updated.name },
        { label: "Descripción", before: previous.description, after: updated.description },
        { label: "Permisos", before: "configuración anterior", after: `${moduleKeys.length} módulos habilitados` },
      ]),
    });
    return [updated];
  });
  if (!role) return Response.json({ error: "El rol ya cambió. Actualiza la página." }, { status: 409 });
  return Response.json({ role, moduleKeys });
}
