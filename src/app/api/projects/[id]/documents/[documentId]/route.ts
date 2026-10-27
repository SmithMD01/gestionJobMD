
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { auditEvent } from "@/modules/audit/schema";
import { deletedDetail, updatedDetail } from "@/modules/audit/details";
import { documentationStatuses } from "@/modules/projects/documentation";
import { projectAuditEvent, projectDocument } from "@/modules/projects/schema";

type Context = { params: Promise<{ id: string; documentId: string }> };
const updateInput = z.object({ status: z.enum(documentationStatuses), notes: z.string().trim().max(2000), isFinal: z.boolean() });

export async function PATCH(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  const parsed = updateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa el estado y las notas del documento" }, { status: 400 });
  if (parsed.data.isFinal && parsed.data.status !== "approved") return Response.json({ error: "Solo una versión aprobada puede marcarse como final" }, { status: 400 });
  const [previous] = await db.select().from(projectDocument).where(and(eq(projectDocument.id, documentId), eq(projectDocument.projectId, id)));
  if (!previous) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  const [updated] = await db.transaction(async (tx) => {
    if (parsed.data.isFinal) await tx.update(projectDocument).set({ isFinal: false, updatedAt: new Date() }).where(and(eq(projectDocument.projectId, id), eq(projectDocument.groupId, previous.groupId), eq(projectDocument.typeId, previous.typeId), eq(projectDocument.isFinal, true)));
    const [item] = await tx.update(projectDocument).set({ status: parsed.data.status, notes: parsed.data.notes, isFinal: parsed.data.isFinal, updatedAt: new Date() }).where(and(eq(projectDocument.id, documentId), eq(projectDocument.projectId, id))).returning();
    if (!item) return [];
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.document.updated" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "project_document", entityId: item.id, entityName: item.title, action: "project_document.updated", changeDetail: updatedDetail("el documento", [{ label: "Estado", before: previous.status, after: item.status }, { label: "Versión final", before: previous.isFinal, after: item.isFinal }]) });
    return [item];
  });
  if (!updated) return Response.json({ error: "No se pudo actualizar el documento" }, { status: 404 });
  const { fileData, ...metadata } = updated;
  void fileData;
  return Response.json({ document: metadata });
}

export async function DELETE(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  const [deleted] = await db.transaction(async (tx) => {
    const [item] = await tx.delete(projectDocument).where(and(eq(projectDocument.id, documentId), eq(projectDocument.projectId, id))).returning();
    if (!item) return [];
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.document.deleted" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "project_document", entityId: item.id, entityName: item.title, action: "project_document.deleted", changeDetail: deletedDetail("el documento", `${item.title} v${item.version}`) });
    return [item];
  });
  if (!deleted) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
