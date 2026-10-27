import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { moduleInProject, projectInCompany } from "@/modules/projects/access";
import { projectAuditEvent, projectModule } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { createdDetail } from "@/modules/audit/details";
import { projectModuleInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const modules = await db.select().from(projectModule).where(and(eq(projectModule.projectId, id), eq(projectModule.isActive, true))).orderBy(asc(projectModule.sortOrder), asc(projectModule.name));
  return Response.json({ modules });
}

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = projectModuleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa los datos del módulo" }, { status: 400 });
  const parentId = parsed.data.parentId || null;
  if (parentId) {
    const parent = await moduleInProject(parentId, id);
    if (!parent) return Response.json({ error: "El módulo padre no existe en este proyecto" }, { status: 400 });
    if (parent.parentId) return Response.json({ error: "Solo se permite un nivel de submódulos" }, { status: 400 });
  }
  const [created] = await db.transaction(async (tx) => {
    const [item] = await tx.insert(projectModule).values({ projectId: id, ...parsed.data, parentId }).returning();
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: parentId ? "project.submodule.created" : "project.module.created" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "project_module", entityId: item.id, entityName: item.name, action: "project_module.created", changeDetail: createdDetail(parentId ? "el submódulo" : "el módulo", item.name) });
    return [item];
  });
  return Response.json({ module: created }, { status: 201 });
}
