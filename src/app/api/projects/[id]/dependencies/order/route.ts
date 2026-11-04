import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { projectInCompany } from "@/modules/projects/access";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectDependency } from "@/modules/projects/schema";

const orderInput = z.object({ orderedIds: z.array(z.uuid()).max(1000) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = orderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data?.orderedIds ?? []).size !== (parsed.data?.orderedIds.length ?? 0)) return Response.json({ error: "El orden enviado no es válido" }, { status: 400 });
  const current = await db.select({ id: projectDependency.id }).from(projectDependency).where(eq(projectDependency.projectId, id));
  const requested = parsed.data.orderedIds;
  if (current.length !== requested.length || current.some((item) => !requested.includes(item.id))) return Response.json({ error: "La lista de dependencias cambió. Actualiza la vista e inténtalo de nuevo." }, { status: 409 });
  await db.transaction(async (tx) => {
    for (const [sortOrder, dependencyId] of requested.entries()) {
      await tx.update(projectDependency).set({ sortOrder, updatedAt: new Date() }).where(and(eq(projectDependency.id, dependencyId), eq(projectDependency.projectId, id)));
    }
  });
  const dependencies = await db.select().from(projectDependency).where(inArray(projectDependency.id, requested)).orderBy(asc(projectDependency.sortOrder));
  return Response.json({ dependencies: dependencies.map((item) => ({ ...item, relatedDependencyIds: [] })) });
}
