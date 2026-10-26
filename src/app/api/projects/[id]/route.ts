import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { project, projectAuditEvent } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInput } from "@/modules/projects/validation";
import { updatedDetail } from "@/modules/audit/details";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const [found] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, access.company!.id)));
  if (!found) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  return Response.json({ project: found });
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = projectInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa los datos del proyecto" }, { status: 400 });
  const [previous] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, access.company!.id)));
  if (!previous) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const changes = [
    { label: "Nombre", before: previous.name, after: parsed.data.name },
    { label: "Objetivo", before: previous.objective, after: parsed.data.objective },
    { label: "Descripción", before: previous.description, after: parsed.data.description },
    { label: "Estado", before: previous.status, after: parsed.data.status },
    { label: "Fecha de inicio", before: previous.startDate, after: parsed.data.startDate },
    { label: "Fin previsto", before: previous.endDate, after: parsed.data.endDate },
  ].filter(({ before, after }) => before !== after);

  const updated = await db.transaction(async (tx) => {
    const [result] = await tx.update(project).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(project.id, id), eq(project.companyId, access.company!.id))).returning();
    if (!result) return null;
    await tx.insert(projectAuditEvent).values({
      projectId: result.id,
      actorUserId: access.session!.user.id,
      action: "project.updated",
    });
    await tx.insert(auditEvent).values({
      companyId: access.company!.id,
      actorUserId: access.session!.user.id,
      entityType: "project",
      entityId: result.id,
      entityName: result.name,
      action: "project.updated",
      changeDetail: updatedDetail("el proyecto", changes),
    });
    return result;
  });
  if (!updated) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  return Response.json({ project: updated });
}
