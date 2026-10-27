import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";
import { project, projectAuditEvent, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";

type Context = { params: Promise<{ id: string }> };

const scheduleItemInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000),
  kind: z.enum(["phase", "activity"]).default("activity"),
  color: z.enum(["slate", "blue", "violet", "amber", "green", "rose"]),
  status: z.enum(["planned", "in_progress", "completed"]).default("planned"),
  startDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  path: ["endDate"], message: "La fecha final debe ser igual o posterior a la fecha inicial",
});

const scheduleInput = z.object({ items: z.array(scheduleItemInput).max(500) });

async function authorize(request: Request, params: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return { access };
  const { id } = await params.params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) {
    return { access, error: Response.json({ error: "Proyecto no encontrado" }, { status: 404 }) };
  }
  return { access, id };
}

export async function GET(request: Request, context: Context) {
  const result = await authorize(request, context);
  if (result.error) return result.error;
  if (!result.id) return result.access.response;
  const [schedule] = await db.select().from(projectSchedule).where(eq(projectSchedule.projectId, result.id));
  if (!schedule) return Response.json({ schedule: null, items: [] });
  const items = await db.select().from(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, schedule.id)).orderBy(asc(projectScheduleItem.sortOrder));
  return Response.json({ schedule, items });
}

export async function POST(request: Request, context: Context) {
  const result = await authorize(request, context);
  if (result.error) return result.error;
  if (!result.id) return result.access.response;
  const parsed = scheduleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Revisa las filas del cronograma" }, { status: 400 });
  const created = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: projectSchedule.id }).from(projectSchedule).where(eq(projectSchedule.projectId, result.id!));
    if (existing) return null;
    const [schedule] = await tx.insert(projectSchedule).values({ projectId: result.id! }).returning();
    if (parsed.data.items.length) await tx.insert(projectScheduleItem).values(parsed.data.items.map((item, index) => ({ scheduleId: schedule.id, ...item, sortOrder: index })));
    const [projectItem] = await tx.select({ name: project.name }).from(project).where(eq(project.id, result.id!));
    await tx.insert(projectAuditEvent).values({ projectId: result.id!, actorUserId: result.access.session!.user.id, action: "project.schedule.created" });
    await tx.insert(auditEvent).values({ companyId: result.access.company!.id, actorUserId: result.access.session!.user.id, entityType: "project", entityId: result.id!, entityName: projectItem?.name ?? "", action: "project.schedule.created", changeDetail: `Se creó el cronograma con ${parsed.data.items.length} ${parsed.data.items.length === 1 ? "fila" : "filas"}.` });
    return schedule;
  });
  if (!created) return Response.json({ error: "El proyecto ya tiene un cronograma" }, { status: 409 });
  const items = await db.select().from(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, created.id)).orderBy(asc(projectScheduleItem.sortOrder));
  return Response.json({ schedule: created, items }, { status: 201 });
}

export async function PUT(request: Request, context: Context) {
  const result = await authorize(request, context);
  if (result.error) return result.error;
  if (!result.id) return result.access.response;
  const parsed = scheduleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Revisa las filas del cronograma" }, { status: 400 });
  const updated = await db.transaction(async (tx) => {
    const [schedule] = await tx.select().from(projectSchedule).where(eq(projectSchedule.projectId, result.id!));
    if (!schedule) return null;
    await tx.delete(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, schedule.id));
    if (parsed.data.items.length) await tx.insert(projectScheduleItem).values(parsed.data.items.map((item, index) => ({ scheduleId: schedule.id, ...item, sortOrder: index })));
    const [next] = await tx.update(projectSchedule).set({ status: "draft", confirmedAt: null, confirmedBy: null, updatedAt: new Date() }).where(eq(projectSchedule.id, schedule.id)).returning();
    const [projectItem] = await tx.select({ name: project.name }).from(project).where(eq(project.id, result.id!));
    await tx.insert(projectAuditEvent).values({ projectId: result.id!, actorUserId: result.access.session!.user.id, action: "project.schedule.updated" });
    await tx.insert(auditEvent).values({ companyId: result.access.company!.id, actorUserId: result.access.session!.user.id, entityType: "project", entityId: result.id!, entityName: projectItem?.name ?? "", action: "project.schedule.updated", changeDetail: `Se editó el cronograma y se guardaron ${parsed.data.items.length} ${parsed.data.items.length === 1 ? "fila" : "filas"}. La vista Gantt refleja estos cambios.` });
    return next;
  });
  if (!updated) return Response.json({ error: "El proyecto no tiene un cronograma" }, { status: 404 });
  const items = await db.select().from(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, updated.id)).orderBy(asc(projectScheduleItem.sortOrder));
  return Response.json({ schedule: updated, items });
}

export async function PATCH(request: Request, context: Context) {
  const result = await authorize(request, context);
  if (result.error) return result.error;
  if (!result.id) return result.access.response;
  const body = await request.json().catch(() => null);
  if (body?.action !== "confirm") return Response.json({ error: "Acción no válida" }, { status: 400 });
  const confirmed = await db.transaction(async (tx) => {
    const [schedule] = await tx.update(projectSchedule).set({ status: "confirmed", confirmedAt: new Date(), confirmedBy: result.access.session!.user.id, updatedAt: new Date() }).where(eq(projectSchedule.projectId, result.id!)).returning();
    if (!schedule) return null;
    const [projectItem] = await tx.select({ name: project.name }).from(project).where(eq(project.id, result.id!));
    await tx.insert(projectAuditEvent).values({ projectId: result.id!, actorUserId: result.access.session!.user.id, action: "project.schedule.confirmed" });
    await tx.insert(auditEvent).values({ companyId: result.access.company!.id, actorUserId: result.access.session!.user.id, entityType: "project", entityId: result.id!, entityName: projectItem?.name ?? "", action: "project.schedule.confirmed", changeDetail: "Se confirmó el cronograma del proyecto." });
    return schedule;
  });
  if (!confirmed) return Response.json({ error: "El proyecto no tiene un cronograma" }, { status: 404 });
  return Response.json({ schedule: confirmed });
}
