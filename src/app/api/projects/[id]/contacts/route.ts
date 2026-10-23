import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { projectAuditEvent, projectContact } from "@/modules/projects/schema";
import { projectContactInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const contacts = await db.select().from(projectContact)
    .where(eq(projectContact.projectId, id))
    .orderBy(asc(projectContact.name), asc(projectContact.id));
  return Response.json({ contacts });
}

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const parsed = projectContactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa el nombre, correo y teléfono del contacto" }, { status: 400 });

  const contact = await db.transaction(async (tx) => {
    const [created] = await tx.insert(projectContact).values({ projectId: id, ...parsed.data }).returning();
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.contact.created" });
    return created;
  });
  return Response.json({ contact }, { status: 201 });
}
