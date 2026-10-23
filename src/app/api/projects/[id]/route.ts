import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { project, projectAuditEvent } from "@/modules/projects/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInput } from "@/modules/projects/validation";

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

  const updated = await db.transaction(async (tx) => {
    const [result] = await tx.update(project).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(project.id, id), eq(project.companyId, access.company!.id))).returning();
    if (!result) return null;
    await tx.insert(projectAuditEvent).values({
      projectId: result.id,
      actorUserId: access.session!.user.id,
      action: "project.updated",
    });
    return result;
  });
  if (!updated) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  return Response.json({ project: updated });
}
