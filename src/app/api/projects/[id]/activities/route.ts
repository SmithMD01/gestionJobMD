import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { companyTeamMember } from "@/modules/companies/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { activityResponsiblesInCompany, moduleInProject, projectInCompany, teamMemberIdsInCompany } from "@/modules/projects/access";
import { activity, activityResponsible, projectAuditEvent } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { activityInput } from "@/modules/projects/validation";
import { createdDetail } from "@/modules/audit/details";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const activities = await db.select().from(activity).where(eq(activity.projectId, id)).orderBy(asc(activity.dueDate), asc(activity.createdAt));
  const activityIds = activities.map((item) => item.id);
  const responsibleByActivity = await activityResponsiblesInCompany(activityIds, access.company!.id);
  return Response.json({ activities: activities.map((item) => ({ ...item, responsibleIds: responsibleByActivity.get(item.id)?.ids ?? [], responsibleNames: responsibleByActivity.get(item.id)?.names ?? [] })) });
}

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const parsed = activityInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa los datos de la actividad" }, { status: 400 });
  const responsibleIds = [...new Set(parsed.data.responsibleIds)];
  const validResponsibleIds = await teamMemberIdsInCompany(responsibleIds, access.company!.id);
  if (validResponsibleIds.length !== responsibleIds.length) return Response.json({ error: "Uno o más responsables no pertenecen a la empresa activa" }, { status: 400 });
  const responsibleMembers = responsibleIds.length ? await db.select({ id: companyTeamMember.id, name: companyTeamMember.name }).from(companyTeamMember).where(and(eq(companyTeamMember.companyId, access.company!.id), inArray(companyTeamMember.id, responsibleIds))) : [];
  if (parsed.data.moduleId && parsed.data.type !== "development") return Response.json({ error: "Solo las actividades de desarrollo pueden relacionarse con un módulo" }, { status: 400 });
  if (parsed.data.moduleId && !await moduleInProject(parsed.data.moduleId, id)) return Response.json({ error: "El módulo no pertenece a este proyecto" }, { status: 400 });
  const created = await db.transaction(async (tx) => {
    const activityValues = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key !== "responsibleIds")) as Omit<typeof parsed.data, "responsibleIds">;
    const activityId = crypto.randomUUID();
    const prefix = activityValues.type === "development" ? "DEV" : "ACT";
    const [item] = await tx.insert(activity).values({ id: activityId, code: `${prefix}-${activityId.slice(0, 8).toUpperCase()}`, projectId: id, createdBy: access.session!.user.id, ...activityValues }).returning();
    if (responsibleIds.length) await tx.insert(activityResponsible).values(responsibleIds.map((teamMemberId) => ({ activityId, teamMemberId })));
    await tx.insert(projectAuditEvent).values({ projectId: id, actorUserId: access.session!.user.id, action: "activity.created" });
    await tx.insert(auditEvent).values({ companyId: access.company!.id, actorUserId: access.session!.user.id, entityType: "activity", entityId: item.id, entityName: item.title, action: "activity.created", changeDetail: createdDetail("la actividad", `${item.code} — ${item.title}`) });
    return item;
  });
  return Response.json({ activity: { ...created, responsibleIds, responsibleNames: responsibleMembers.map((member) => member.name) } }, { status: 201 });
}
