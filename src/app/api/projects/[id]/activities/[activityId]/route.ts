import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { activity, activityResponsible, projectAuditEvent } from "@/modules/projects/schema";
import { activityInput } from "@/modules/projects/validation";

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
  const { responsibleIds, ...activityValues } = parsed.data;
  const prefix = activityValues.type === "development" ? "DEV" : "ACT";
  const [updated] = await db.update(activity).set({ ...activityValues, code: `${prefix}-${result.activityId.slice(0, 8).toUpperCase()}`, updatedAt: new Date() }).where(and(eq(activity.id, result.activityId), eq(activity.projectId, result.id))).returning();
  if (!updated) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  await db.delete(activityResponsible).where(eq(activityResponsible.activityId, result.activityId));
  if (responsibleIds.length) await db.insert(activityResponsible).values(responsibleIds.map((teamMemberId) => ({ activityId: result.activityId!, teamMemberId })));
  await db.insert(projectAuditEvent).values({ projectId: result.id, actorUserId: result.auth.session!.user.id, action: "activity.updated" });
  return Response.json({ activity: { ...updated, responsibleIds } });
}
export async function DELETE(request: Request, context: Context) {
  const result = await access(request, context); if (result.error) return result.error; if (!result.id || !result.activityId) return result.auth.response;
  const [deleted] = await db.delete(activity).where(and(eq(activity.id, result.activityId), eq(activity.projectId, result.id))).returning({ id: activity.id });
  if (!deleted) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  await db.insert(projectAuditEvent).values({ projectId: result.id, actorUserId: result.auth.session!.user.id, action: "activity.deleted" });
  return new Response(null, { status: 204 });
}
