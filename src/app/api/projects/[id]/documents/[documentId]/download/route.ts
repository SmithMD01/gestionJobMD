
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { projectDocument } from "@/modules/projects/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || !await projectInCompany(id, access.company!.id)) return new Response("Documento no encontrado", { status: 404 });
  const [document] = await db.select({ fileName: projectDocument.fileName, mimeType: projectDocument.mimeType, fileData: projectDocument.fileData })
    .from(projectDocument).where(and(eq(projectDocument.id, documentId), eq(projectDocument.projectId, id)));
  if (!document) return new Response("Documento no encontrado", { status: 404 });
  const fileData = Buffer.from(document.fileData, "base64");
  return new Response(new Uint8Array(fileData), {
    headers: {
      "content-type": document.mimeType,
      "content-length": String(fileData.length),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "cache-control": "private, no-store",
    },
  });
}
