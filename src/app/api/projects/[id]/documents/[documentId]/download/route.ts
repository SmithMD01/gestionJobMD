
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser } from "@/modules/companies/context";
import { cookies } from "next/headers";
import { hasModuleAccess } from "@/modules/access/permissions";
import { projectInCompany } from "@/modules/projects/access";
import { projectDocument } from "@/modules/projects/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("No autenticado", { status: 401 });
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const activeCompany = await activeCompanyForUser(session.user.id, selectedId);
  if (!activeCompany || !await hasModuleAccess(session.user.id, activeCompany.id, "projects.documentation", session.user.role)) return new Response("No autorizado", { status: 403 });
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || !await projectInCompany(id, activeCompany.id)) return new Response("Documento no encontrado", { status: 404 });
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
