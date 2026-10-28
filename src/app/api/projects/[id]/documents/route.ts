
import { and, desc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { auditEvent } from "@/modules/audit/schema";
import { createdDetail } from "@/modules/audit/details";
import { projectAuditEvent, projectDocument } from "@/modules/projects/schema";
import { documentationGroup, documentationStatuses, documentationType } from "@/modules/projects/documentation";

type Context = { params: Promise<{ id: string }> };
const maxFileSize = 10 * 1024 * 1024;
const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|md|txt|csv|json|zip)$/i;

const documentSelect = {
  id: projectDocument.id,
  projectId: projectDocument.projectId,
  groupId: projectDocument.groupId,
  typeId: projectDocument.typeId,
  title: projectDocument.title,
  version: projectDocument.version,
  status: projectDocument.status,
  isFinal: projectDocument.isFinal,
  fileName: projectDocument.fileName,
  mimeType: projectDocument.mimeType,
  fileSize: projectDocument.fileSize,
  notes: projectDocument.notes,
  createdBy: projectDocument.createdBy,
  createdAt: projectDocument.createdAt,
  updatedAt: projectDocument.updatedAt,
};

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const documents = await db.select(documentSelect).from(projectDocument)
    .where(eq(projectDocument.projectId, id))
    .orderBy(desc(projectDocument.updatedAt), desc(projectDocument.version));
  return Response.json({ documents });
}

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const form = await request.formData();
  const groupId = String(form.get("groupId") ?? "");
  const typeId = String(form.get("typeId") ?? "");
  const group = documentationGroup(groupId);
  const type = documentationType(groupId, typeId);
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim() || type?.[1] || "Documento";
  const notes = String(form.get("notes") ?? "").trim();
  const status = String(form.get("status") ?? "draft");
  const uploadKey = String(form.get("uploadKey") ?? "");
  if (!group || !type || !documentationStatuses.includes(status as typeof documentationStatuses[number])) return Response.json({ error: "Selecciona una sección y tipo de documento válidos" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Adjunta un archivo" }, { status: 400 });
  if (file.size > maxFileSize) return Response.json({ error: "El archivo no puede superar los 10 MB" }, { status: 400 });
  if (!allowedExtensions.test(file.name)) return Response.json({ error: "Formato no permitido. Usa PDF, Office, Markdown, texto, CSV, JSON o ZIP" }, { status: 400 });
  if (title.length > 160 || notes.length > 2000) return Response.json({ error: "El título o las notas superan el límite permitido" }, { status: 400 });
  if (uploadKey && !z.uuid().safeParse(uploadKey).success) return Response.json({ error: "Identificador de carga no válido" }, { status: 400 });

  const encodedFileData = Buffer.from(await file.arrayBuffer()).toString("base64");
  const result = await db.transaction(async (tx) => {
    // Serialize uploads for this project before checking the key and assigning a version.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
    if (uploadKey) {
      const [existing] = await tx.select(documentSelect).from(projectDocument)
        .where(and(eq(projectDocument.projectId, id), eq(projectDocument.uploadKey, uploadKey)));
      if (existing) return { document: existing, created: false };
    }
    const [latest] = await tx.select({ version: max(projectDocument.version) }).from(projectDocument)
      .where(and(eq(projectDocument.projectId, id), eq(projectDocument.groupId, groupId), eq(projectDocument.typeId, typeId)));
    const version = Number(latest?.version ?? 0) + 1;
    const [item] = await tx.insert(projectDocument).values({ projectId: id, groupId, typeId, title, version, uploadKey: uploadKey || null, status: status as typeof documentationStatuses[number], fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, fileData: encodedFileData, notes, createdBy: access.session!.user.id }).returning(documentSelect);
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.document.created" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "project_document", entityId: item.id, entityName: title, action: "project_document.created", changeDetail: createdDetail("el documento", `${type[1]} v${version}`) });
    return { document: item, created: true };
  });
  return Response.json({ document: result.document }, { status: result.created ? 201 : 200 });
}
