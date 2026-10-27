import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { moduleInProject, projectInCompany } from "@/modules/projects/access";
import { activity, projectAuditEvent, projectModule } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { deletedDetail, updatedDetail } from "@/modules/audit/details";
import { projectModuleInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string; moduleId: string }> };

async function access(request: Request, params: Context) {
  const auth = await authorizeProjectRequest(request);
  if (auth.response) return { auth };
  const { id, moduleId } = await params.params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(moduleId).success || !await projectInCompany(id, auth.company!.id)) return { auth, error: Response.json({ error: "Módulo no encontrado" }, { status: 404 }) };
  const moduleRecord = await moduleInProject(moduleId, id);
  if (!moduleRecord) return { auth, error: Response.json({ error: "Módulo no encontrado" }, { status: 404 }) };
  return { auth, id, moduleId, module: moduleRecord };
}

export async function PATCH(request: Request, context: Context) {
  const result = await access(request, context);
  if (result.error) return result.error;
  const parsed = projectModuleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa los datos del módulo" }, { status: 400 });
  const parentId = parsed.data.parentId || null;
  if (parentId) {
    const parent = await moduleInProject(parentId, result.id!);
    if (!parent || parent.id === result.moduleId) return Response.json({ error: "El módulo padre no es válido" }, { status: 400 });
    if (parent.parentId) return Response.json({ error: "Solo se permite un nivel de submódulos" }, { status: 400 });
  }
  const [updated] = await db.update(projectModule).set({ ...parsed.data, parentId, updatedAt: new Date() }).where(and(eq(projectModule.id, result.moduleId!), eq(projectModule.projectId, result.id!))).returning();
  if (!updated) return Response.json({ error: "Módulo no encontrado" }, { status: 404 });
  await db.insert(projectAuditEvent).values({ projectId: result.id!, actorUserId: result.auth.session!.user.id, action: "project.module.updated" });
  await db.insert(auditEvent).values({ companyId: result.auth.company!.id, actorUserId: result.auth.session!.user.id, entityType: "project_module", entityId: updated.id, entityName: updated.name, action: "project_module.updated", changeDetail: updatedDetail("el módulo", [{ label: "Nombre", before: result.module!.name, after: updated.name }, { label: "Módulo padre", before: result.module!.parentId, after: updated.parentId }]) });
  return Response.json({ module: updated });
}

export async function DELETE(request: Request, context: Context) {
  const result = await access(request, context);
  if (result.error) return result.error;
  const [children, activities] = await Promise.all([
    db.select({ id: projectModule.id }).from(projectModule).where(eq(projectModule.parentId, result.moduleId!)).limit(1),
    db.select({ id: activity.id }).from(activity).where(eq(activity.moduleId, result.moduleId!)).limit(1),
  ]);
  if (children.length || activities.length) return Response.json({ error: "No se puede eliminar un módulo con submódulos o actividades relacionadas" }, { status: 409 });
  const [deleted] = await db.delete(projectModule).where(and(eq(projectModule.id, result.moduleId!), eq(projectModule.projectId, result.id!))).returning({ id: projectModule.id, name: projectModule.name });
  if (!deleted) return Response.json({ error: "Módulo no encontrado" }, { status: 404 });
  await db.insert(projectAuditEvent).values({ projectId: result.id!, actorUserId: result.auth.session!.user.id, action: "project.module.deleted" });
  await db.insert(auditEvent).values({ companyId: result.auth.company!.id, actorUserId: result.auth.session!.user.id, entityType: "project_module", entityId: deleted.id, entityName: deleted.name, action: "project_module.deleted", changeDetail: deletedDetail("el módulo", deleted.name) });
  return new Response(null, { status: 204 });
}
