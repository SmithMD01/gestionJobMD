import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { project, projectAuditEvent } from "@/modules/projects/schema";
import { projectStatusInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = projectStatusInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona un estado válido" }, { status: 400 });

  const { status, expectedStatus } = parsed.data;
  const updated = await db.transaction(async (tx) => {
    const [item] = await tx.update(project)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(project.id, id), eq(project.companyId, access.company!.id), eq(project.status, expectedStatus)))
      .returning();
    if (!item) return null;

    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.updated" });
    await tx.insert(auditEvent).values({
      companyId: access.company!.id,
      actorUserId: access.session!.user.id,
      entityType: "project",
      entityId: id,
      entityName: item.name,
      action: "project.updated",
      changeDetail: updatedDetail("el proyecto", [{ label: "Estado", before: expectedStatus, after: status }]),
    });
    return item;
  });

  if (!updated) {
    const [current] = await db.select({ status: project.status }).from(project)
      .where(and(eq(project.id, id), eq(project.companyId, access.company!.id)));
    if (!current) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return Response.json({ error: "El estado cambió en otra sesión. Revisa el estado actual e inténtalo de nuevo.", currentStatus: current.status }, { status: 409 });
  }

  return Response.json({ project: updated });
}
