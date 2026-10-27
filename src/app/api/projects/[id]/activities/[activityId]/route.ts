import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { companyTeamMember } from "@/modules/companies/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { moduleInProject, projectInCompany, teamMemberIdsInCompany } from "@/modules/projects/access";
import { activity, activityResponsible, projectAuditEvent } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { activityInput } from "@/modules/projects/validation";
import { deletedDetail, updatedDetail } from "@/modules/audit/details";

type Context = { params: Promise<{ id: string; activityId: string }> };
async function access(request: Request, params: Context) {
  const auth = await authorizeProjectRequest(request); if (auth.response) return { auth };
  const { id, activityId } = await params.params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(activityId).success || !await projectInCompany(id, auth.company!.id)) return { auth, error: Response.json({ error: "Actividad no encontrada" }, { status: 404 }) };
  return { auth, id, activityId };
}
export async function PATCH(request: Request, context: Context) {
  const result = await access(request, context); if (result.error) return result.error; if (!result.id || !result.activityId) return result.auth.response;
  const parsed = activityInput.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "Revisa los datos de la actividad" }, { status: 400 });
  const responsibleIds = [...new Set(parsed.data.responsibleIds)];
  const validResponsibleIds = await teamMemberIdsInCompany(responsibleIds, result.auth.company!.id);
  if (validResponsibleIds.length !== responsibleIds.length) return Response.json({ error: "Uno o más responsables no pertenecen a la empresa activa" }, { status: 400 });
  const responsibleMembers = responsibleIds.length ? await db.select({ id: companyTeamMember.id, name: companyTeamMember.name }).from(companyTeamMember).where(and(eq(companyTeamMember.companyId, result.auth.company!.id), inArray(companyTeamMember.id, responsibleIds))) : [];
  if (parsed.data.moduleId && parsed.data.type !== "development") return Response.json({ error: "Solo las actividades de desarrollo pueden relacionarse con un módulo" }, { status: 400 });
  if (parsed.data.moduleId && !await moduleInProject(parsed.data.moduleId, result.id)) return Response.json({ error: "El módulo no pertenece a este proyecto" }, { status: 400 });
  const activityValues = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key !== "responsibleIds")) as Omit<typeof parsed.data, "responsibleIds">;
  const [previous] = await db.select().from(activity).where(and(eq(activity.id, result.activityId), eq(activity.projectId, result.id)));
  if (!previous) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const changes = [
    { label: "Título", before: previous.title, after: activityValues.title },
    { label: "Etapa", before: previous.developmentStageId, after: activityValues.developmentStageId },
    { label: "Módulo", before: previous.moduleId, after: activityValues.moduleId },
    { label: "Tipo", before: previous.type, after: activityValues.type },
    { label: "Estado", before: previous.status, after: activityValues.status },
    { label: "Prioridad", before: previous.priority, after: activityValues.priority },
    { label: "Fecha de actividad", before: previous.activityDate, after: activityValues.activityDate },
    { label: "Fecha límite", before: previous.dueDate, after: activityValues.dueDate },
    { label: "Horas", before: previous.hours, after: activityValues.hours },
    { label: "Observaciones", before: previous.observations, after: activityValues.observations },
    { label: "Checklist", before: previous.checklist, after: activityValues.checklist },
    { label: "Origen", before: previous.origin, after: activityValues.origin },
  ].filter(({ before, after }) => before !== after);
  const prefix = activityValues.type === "development" ? "DEV" : "ACT";
  const [updated] = await db.update(activity).set({ ...activityValues, code: `${prefix}-${result.activityId.slice(0, 8).toUpperCase()}`, updatedAt: new Date() }).where(and(eq(activity.id, result.activityId), eq(activity.projectId, result.id))).returning();
  if (!updated) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  await db.delete(activityResponsible).where(eq(activityResponsible.activityId, result.activityId));
  if (responsibleIds.length) await db.insert(activityResponsible).values(responsibleIds.map((teamMemberId) => ({ activityId: result.activityId!, teamMemberId })));
  await db.insert(projectAuditEvent).values({ projectId: result.id, actorUserId: result.auth.session!.user.id, action: "activity.updated" });
  await db.insert(auditEvent).values({ companyId: result.auth.company!.id, actorUserId: result.auth.session!.user.id, entityType: "activity", entityId: updated.id, entityName: updated.title, action: "activity.updated", changeDetail: updatedDetail("la actividad", changes) });
  return Response.json({ activity: { ...updated, responsibleIds, responsibleNames: responsibleMembers.map((member) => member.name) } });
}
export async function DELETE(request: Request, context: Context) {
  const result = await access(request, context); if (result.error) return result.error; if (!result.id || !result.activityId) return result.auth.response;
  const [deleted] = await db.delete(activity).where(and(eq(activity.id, result.activityId), eq(activity.projectId, result.id))).returning({ id: activity.id, title: activity.title });
  if (!deleted) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  await db.insert(projectAuditEvent).values({ projectId: result.id, actorUserId: result.auth.session!.user.id, action: "activity.deleted" });
  await db.insert(auditEvent).values({ companyId: result.auth.company!.id, actorUserId: result.auth.session!.user.id, entityType: "activity", entityId: deleted.id, entityName: deleted.title, action: "activity.deleted", changeDetail: deletedDetail("la actividad", deleted.title) });
  return new Response(null, { status: 204 });
}
