import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditEvent } from "@/modules/audit/schema";
import { updatedDetail } from "@/modules/audit/details";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { activity, developmentStage, projectAuditEvent } from "@/modules/projects/schema";

type Context = { params: Promise<{ id: string; activityId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, activityId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(activityId).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const parsed = z.object({ developmentStageId: z.uuid() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecciona una etapa válida." }, { status: 400 });
  const [target] = await db.select().from(developmentStage).where(and(eq(developmentStage.id, parsed.data.developmentStageId), eq(developmentStage.companyId, access.company!.id), eq(developmentStage.isActive, true)));
  if (!target) return Response.json({ error: "La etapa no pertenece al pipeline de esta empresa." }, { status: 400 });
  const updated = await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(activity).where(and(eq(activity.id, activityId), eq(activity.projectId, id)));
    if (!previous || previous.type !== "development") return null;
    if (previous.developmentStageId === target.id) return previous;
    const now = new Date();
    const nextStatus = target.isCancelled ? "cancelled" : target.isTerminal ? "completed" : previous.status === "cancelled" || previous.status === "completed" ? "pending" : previous.status;
    const completedAt = target.isTerminal ? now : null;
    const [item] = await tx.update(activity).set({ developmentStageId: target.id, status: nextStatus, completedAt, updatedAt: now }).where(and(eq(activity.id, activityId), eq(activity.projectId, id))).returning();
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "activity.stage_changed" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "activity", entityId: item.id, entityName: item.title, action: "activity.updated", changeDetail: updatedDetail("la actividad", [{ label: "Etapa", before: previous.developmentStageId ?? "Sin etapa", after: target.name }]) });
    return item;
  });
  if (!updated) return Response.json({ error: "Actividad de desarrollo no encontrada." }, { status: 404 });
  return Response.json({ activity: updated });
}
