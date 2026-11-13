import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { activity, activityTimeEntry } from "@/modules/projects/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { activityTimeEntryInput } from "@/modules/projects/validation";

type Context = { params: Promise<{ id: string; activityId: string }> };

export async function POST(request: Request, { params }: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;
  const { id, activityId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(activityId).success || !await projectInCompany(id, access.company!.id)) {
    return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  }
  const parsed = activityTimeEntryInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Registra un tiempo entre 30 minutos y 24 horas, en bloques de 30 minutos." }, { status: 400 });
  const [parent] = await db.select({ id: activity.id }).from(activity).where(and(eq(activity.id, activityId), eq(activity.projectId, id)));
  if (!parent) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });

  const [entry] = await db.insert(activityTimeEntry).values({
    activityId,
    minutes: parsed.data.minutes,
    loggedBy: access.session!.user.id,
  }).returning();
  return Response.json({ entry: { ...entry, loggedByName: access.session!.user.name } }, { status: 201 });
}
