import { and, asc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser } from "@/modules/companies/context";
import { activity, developmentStage } from "@/modules/projects/schema";
import { DEVELOPMENT_STAGE_COLORS } from "@/modules/projects/pipeline";
import { hasModuleAccess } from "@/modules/access/permissions";

const colorSchema = z.enum(DEVELOPMENT_STAGE_COLORS);
const createSchema = z.object({ name: z.string().trim().min(1).max(80), color: colorSchema }).strict();
const updateSchema = z.object({ stages: z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(80), color: colorSchema, sortOrder: z.number().int().min(0).max(1000), isTerminal: z.boolean(), isCancelled: z.boolean() }).strict()).min(2).max(30) }).strict();

async function authorize(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { response: Response.json({ error: "No autenticado" }, { status: 401 }) };
  if (session.user.role === "admin" && !session.user.twoFactorEnabled) return { response: Response.json({ error: "No autorizado" }, { status: 403 }) };
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const company = await activeCompanyForUser(session.user.id, selectedId);
  if (!company) return { response: Response.json({ error: "Selecciona una empresa" }, { status: 409 }) };
  if (!await hasModuleAccess(session.user.id, company.id, "settings.pipeline", session.user.role)) return { response: Response.json({ error: "No tienes acceso al pipeline de desarrollo." }, { status: 403 }) };
  if (request.method !== "GET" && session.user.role !== "admin") return { response: Response.json({ error: "Solo el administrador puede modificar el pipeline." }, { status: 403 }) };
  if (!company.isActive && request.method !== "GET") return { response: Response.json({ error: "La empresa está inactiva. Solo puedes consultar su información." }, { status: 403 }) };
  return { session, company };
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const stages = await db.select({ id: developmentStage.id, name: developmentStage.name, color: developmentStage.color, sortOrder: developmentStage.sortOrder, isActive: developmentStage.isActive, isTerminal: developmentStage.isTerminal, isCancelled: developmentStage.isCancelled })
    .from(developmentStage).where(and(eq(developmentStage.companyId, access.company!.id), eq(developmentStage.isActive, true))).orderBy(asc(developmentStage.sortOrder));
  return Response.json({ stages });
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa el nombre y color de la etapa." }, { status: 400 });
  const existing = await db.select({ id: developmentStage.id, name: developmentStage.name, sortOrder: developmentStage.sortOrder }).from(developmentStage)
    .where(and(eq(developmentStage.companyId, access.company!.id), eq(developmentStage.isActive, true))).orderBy(asc(developmentStage.sortOrder));
  if (existing.some((stage) => stage.name.toLocaleLowerCase() === parsed.data.name.toLocaleLowerCase())) return Response.json({ error: "Ya existe una etapa con ese nombre." }, { status: 409 });
  const [terminal] = await db.select({ id: developmentStage.id, sortOrder: developmentStage.sortOrder }).from(developmentStage).where(and(eq(developmentStage.companyId, access.company!.id), eq(developmentStage.isTerminal, true)));
  const insertOrder = terminal?.sortOrder ?? existing.length;
  const [stage] = await db.transaction(async (tx) => {
    for (const item of existing.filter((item) => item.sortOrder >= insertOrder).toReversed()) await tx.update(developmentStage).set({ sortOrder: item.sortOrder + 1, updatedAt: new Date() }).where(eq(developmentStage.id, item.id));
    return tx.insert(developmentStage).values({ companyId: access.company!.id, ...parsed.data, sortOrder: insertOrder }).returning();
  });
  return Response.json({ stage }, { status: 201 });
}

export async function PUT(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "La lista de etapas no es válida." }, { status: 400 });
  const stages = parsed.data.stages;
  const ids = stages.map((stage) => stage.id);
  if (new Set(ids).size !== ids.length || stages.filter((stage) => stage.isTerminal).length !== 1 || stages.filter((stage) => stage.isCancelled).length !== 1 || stages.some((stage) => stage.isTerminal && stage.isCancelled)) {
    return Response.json({ error: "Debe haber una sola etapa finalizada y una sola etapa cancelada." }, { status: 400 });
  }
  if (new Set(stages.map((stage) => stage.name.toLocaleLowerCase())).size !== stages.length) return Response.json({ error: "Los nombres de las etapas deben ser únicos." }, { status: 400 });
  const cancelledStage = stages.find((stage) => stage.isCancelled);
  if (cancelledStage?.sortOrder !== stages.length - 1) return Response.json({ error: "La etapa de cancelación debe mantenerse al final del pipeline." }, { status: 400 });
  const terminalStage = stages.find((stage) => stage.isTerminal);
  if (terminalStage?.sortOrder !== stages.length - 2) return Response.json({ error: "La etapa Finalizada debe quedar al final del flujo activo, justo antes de Canceladas." }, { status: 400 });
  const current = await db.select({ id: developmentStage.id, isTerminal: developmentStage.isTerminal, isCancelled: developmentStage.isCancelled }).from(developmentStage).where(and(eq(developmentStage.companyId, access.company!.id), eq(developmentStage.isActive, true)));
  if (current.length !== ids.length || current.some((stage) => !ids.includes(stage.id))) return Response.json({ error: "La lista cambió. Actualiza la página e inténtalo otra vez." }, { status: 409 });
  await db.transaction(async (tx) => {
    await tx.update(developmentStage).set({ isTerminal: false, isCancelled: false, updatedAt: new Date() }).where(and(eq(developmentStage.companyId, access.company!.id), inArray(developmentStage.id, ids)));
    for (const stage of stages) {
      await tx.update(developmentStage).set({ name: stage.name, color: stage.color, sortOrder: stage.sortOrder, isTerminal: stage.isTerminal, isCancelled: stage.isCancelled, updatedAt: new Date() })
        .where(and(eq(developmentStage.companyId, access.company!.id), eq(developmentStage.id, stage.id)));
    }
    for (const stage of stages) {
      const previous = current.find((item) => item.id === stage.id);
      if (previous?.isTerminal === stage.isTerminal && previous.isCancelled === stage.isCancelled) continue;
      if (stage.isTerminal) await tx.update(activity).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(activity.developmentStageId, stage.id));
      else if (previous?.isTerminal) await tx.update(activity).set({ status: "pending", completedAt: null, updatedAt: new Date() }).where(and(eq(activity.developmentStageId, stage.id), eq(activity.status, "completed")));
      if (stage.isCancelled) await tx.update(activity).set({ status: "cancelled", completedAt: null, updatedAt: new Date() }).where(eq(activity.developmentStageId, stage.id));
      else if (previous?.isCancelled && !stage.isTerminal) await tx.update(activity).set({ status: "pending", completedAt: null, updatedAt: new Date() }).where(and(eq(activity.developmentStageId, stage.id), eq(activity.status, "cancelled")));
    }
  });
  return Response.json({ stages });
}
