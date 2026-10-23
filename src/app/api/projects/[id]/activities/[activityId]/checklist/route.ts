import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { activity, projectAuditEvent } from "@/modules/projects/schema";

type Context = { params: Promise<{ id: string; activityId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await authorizeProjectRequest(request);
  if (auth.response) return auth.response;
  const { id, activityId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(activityId).success || !await projectInCompany(id, auth.company!.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const parsed = z.object({ checklist: z.string().max(5000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Checklist no válido" }, { status: 400 });
  const [updated] = await db.update(activity).set({ checklist: parsed.data.checklist, updatedAt: new Date() }).where(and(eq(activity.id, activityId), eq(activity.projectId, id))).returning();
  if (!updated) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  await db.insert(projectAuditEvent).values({ projectId: id, actorUserId: auth.session!.user.id, action: "activity.checklist.updated" });
  return Response.json({ activity: updated });
}
