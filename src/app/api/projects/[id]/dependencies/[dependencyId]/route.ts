import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvent } from "@/modules/audit/schema";
import { deletedDetail, updatedDetail } from "@/modules/audit/details";
import { projectInCompany } from "@/modules/projects/access";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectAuditEvent, projectDependency, projectDependencyRelation } from "@/modules/projects/schema";
import { projectDependencyInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string; dependencyId: string }> };

async function getRecord(request: Request, context: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return { response: access.response };
  const { id, dependencyId } = await context.params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(dependencyId).success || !await projectInCompany(id, access.company!.id)) return { response: Response.json({ error: "Dependencia no encontrada" }, { status: 404 }) };
  const [dependency] = await db.select().from(projectDependency).where(and(eq(projectDependency.id, dependencyId), eq(projectDependency.projectId, id)));
  if (!dependency) return { response: Response.json({ error: "Dependencia no encontrada" }, { status: 404 }) };
  return { access, id, dependencyId, dependency };
}

export async function PATCH(request: Request, context: Context) {
  const current = await getRecord(request, context);
  if (current.response) return current.response;
  const parsed = projectDependencyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del punto" }, { status: 400 });
  if (parsed.data.relatedDependencyIds.includes(current.dependencyId!)) return Response.json({ error: "Un punto no puede depender de sí mismo" }, { status: 400 });
  if (parsed.data.relatedDependencyIds.length) {
    const related = await db.select({ id: projectDependency.id }).from(projectDependency).where(and(eq(projectDependency.projectId, current.id!), inArray(projectDependency.id, parsed.data.relatedDependencyIds)));
    if (related.length !== parsed.data.relatedDependencyIds.length) return Response.json({ error: "Una o más dependencias relacionadas no pertenecen a este proyecto" }, { status: 400 });
  }
  const previous = current.dependency!;
  const now = new Date();
  const answeredAt = parsed.data.status === "pending" ? null : previous.answeredAt ?? now;
  const confirmedAt = parsed.data.status === "resolved" ? previous.confirmedAt ?? now : null;
  try {
    const [updated] = await db.transaction(async (tx) => {
      const [item] = await tx.update(projectDependency).set({ ...parsed.data, answeredAt, confirmedAt, updatedAt: now }).where(and(eq(projectDependency.id, current.dependencyId!), eq(projectDependency.projectId, current.id!))).returning();
      await tx.delete(projectDependencyRelation).where(eq(projectDependencyRelation.dependencyId, current.dependencyId!));
      if (parsed.data.relatedDependencyIds.length) await tx.insert(projectDependencyRelation).values(parsed.data.relatedDependencyIds.map((relatedDependencyId) => ({ dependencyId: current.dependencyId!, relatedDependencyId })));
      await tx.insert(projectAuditEvent).values({ projectId: current.id!, actorUserId: current.access!.session!.user.id, action: "project.dependency.updated" });
      await tx.insert(auditEvent).values({ companyId: current.access!.company!.id, actorUserId: current.access!.session!.user.id, entityType: "project_dependency", entityId: item.id, entityName: item.externalCode || item.title, action: "project_dependency.updated", changeDetail: updatedDetail("la dependencia", [
        { label: "Código de referencia", before: previous.externalCode, after: item.externalCode },
        { label: "Punto", before: previous.title, after: item.title },
        { label: "Estado", before: previous.status, after: item.status },
        { label: "Respuesta", before: previous.response, after: item.response },
      ]) });
      return [item];
    });
    return Response.json({ dependency: { ...updated, relatedDependencyIds: parsed.data.relatedDependencyIds } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return Response.json({ error: "Ese código de la fábrica ya está registrado en este proyecto" }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request, context: Context) {
  const current = await getRecord(request, context);
  if (current.response) return current.response;
  const deleted = await db.transaction(async (tx) => {
    const [item] = await tx.delete(projectDependency).where(and(eq(projectDependency.id, current.dependencyId!), eq(projectDependency.projectId, current.id!))).returning();
    if (!item) return null;
    await tx.insert(projectAuditEvent).values({ projectId: current.id!, actorUserId: current.access!.session!.user.id, action: "project.dependency.deleted" });
    await tx.insert(auditEvent).values({ companyId: current.access!.company!.id, actorUserId: current.access!.session!.user.id, entityType: "project_dependency", entityId: item.id, entityName: item.externalCode || item.title, action: "project_dependency.deleted", changeDetail: deletedDetail("la dependencia", item.externalCode ? `${item.externalCode} · ${item.title}` : item.title) });
    return item;
  });
  if (!deleted) return Response.json({ error: "Dependencia no encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}
