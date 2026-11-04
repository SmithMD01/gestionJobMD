import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvent } from "@/modules/audit/schema";
import { createdDetail } from "@/modules/audit/details";
import { projectInCompany } from "@/modules/projects/access";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectAuditEvent, projectDependency, projectDependencyRelation } from "@/modules/projects/schema";
import { projectDependencyInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = projectDependencyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del punto" }, { status: 400 });
  if (parsed.data.relatedDependencyIds.length) {
    const related = await db.select({ id: projectDependency.id }).from(projectDependency).where(and(eq(projectDependency.projectId, id), inArray(projectDependency.id, parsed.data.relatedDependencyIds)));
    if (related.length !== parsed.data.relatedDependencyIds.length) return Response.json({ error: "Una o más dependencias relacionadas no pertenecen a este proyecto" }, { status: 400 });
  }
  const [maxOrder] = await db.select({ value: max(projectDependency.sortOrder) }).from(projectDependency).where(eq(projectDependency.projectId, id));
  try {
    const now = new Date();
    const [created] = await db.transaction(async (tx) => {
      const [dependency] = await tx.insert(projectDependency).values({ projectId: id, ...parsed.data, answeredAt: parsed.data.status === "pending" ? null : now, confirmedAt: parsed.data.status === "resolved" ? now : null, sortOrder: (maxOrder.value ?? -1) + 1, createdBy: access.session!.user.id }).returning();
      if (parsed.data.relatedDependencyIds.length) await tx.insert(projectDependencyRelation).values(parsed.data.relatedDependencyIds.map((relatedDependencyId) => ({ dependencyId: dependency.id, relatedDependencyId })));
      await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "project.dependency.created" });
      await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "project_dependency", entityId: dependency.id, entityName: dependency.externalCode || dependency.title, action: "project_dependency.created", changeDetail: createdDetail("la dependencia", dependency.externalCode ? `${dependency.externalCode} · ${dependency.title}` : dependency.title) });
      return [dependency];
    });
    return Response.json({ dependency: { ...created, relatedDependencyIds: parsed.data.relatedDependencyIds } }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return Response.json({ error: "Ese código de la fábrica ya está registrado en este proyecto" }, { status: 409 });
    throw error;
  }
}

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const dependencies = await db.select().from(projectDependency).where(eq(projectDependency.projectId, id)).orderBy(asc(projectDependency.sortOrder), asc(projectDependency.createdAt));
  const ids = dependencies.map((item) => item.id);
  const relations = ids.length ? await db.select().from(projectDependencyRelation).where(inArray(projectDependencyRelation.dependencyId, ids)) : [];
  const relatedIds = new Map<string, string[]>();
  for (const relation of relations) relatedIds.set(relation.dependencyId, [...(relatedIds.get(relation.dependencyId) ?? []), relation.relatedDependencyId]);
  return Response.json({ dependencies: dependencies.map((item) => ({ ...item, relatedDependencyIds: relatedIds.get(item.id) ?? [] })) });
}

