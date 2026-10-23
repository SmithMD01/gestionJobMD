import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { projectAuditEvent, projectContact } from "@/modules/projects/schema";
import { projectContactInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, contactId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(contactId).success || !await projectInCompany(id, access.company!.id)) {
    return Response.json({ error: "Contacto no encontrado" }, { status: 404 });
  }
  const parsed = projectContactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa el nombre, correo y teléfono del contacto" }, { status: 400 });

  const contact = await db.transaction(async (tx) => {
    const [updated] = await tx.update(projectContact).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(projectContact.id, contactId), eq(projectContact.projectId, id))).returning();
    if (!updated) return null;
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.contact.updated" });
    return updated;
  });
  if (!contact) return Response.json({ error: "Contacto no encontrado" }, { status: 404 });
  return Response.json({ contact });
}

export async function DELETE(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, contactId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(contactId).success || !await projectInCompany(id, access.company!.id)) {
    return Response.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  const deleted = await db.transaction(async (tx) => {
    const [contact] = await tx.delete(projectContact)
      .where(and(eq(projectContact.id, contactId), eq(projectContact.projectId, id))).returning({ id: projectContact.id });
    if (!contact) return false;
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.contact.deleted" });
    return true;
  });
  if (!deleted) return Response.json({ error: "Contacto no encontrado" }, { status: 404 });
  return new Response(null, { status: 204 });
}
