import { and, count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser } from "@/modules/companies/context";
import { activity, developmentStage } from "@/modules/projects/schema";
import { hasModuleAccess } from "@/modules/access/permissions";

type Context = { params: Promise<{ stageId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) return Response.json({ error: "Solo el administrador puede modificar el pipeline." }, { status: 403 });
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const company = await activeCompanyForUser(session.user.id, selectedId);
  if (!company) return Response.json({ error: "Selecciona una empresa" }, { status: 409 });
  if (!await hasModuleAccess(session.user.id, company.id, "settings.pipeline", session.user.role)) return Response.json({ error: "No tienes acceso al pipeline de desarrollo." }, { status: 403 });
  if (!company.isActive) return Response.json({ error: "La empresa está inactiva." }, { status: 403 });
  const { stageId } = await params;
  if (!z.uuid().safeParse(stageId).success) return Response.json({ error: "Etapa no encontrada" }, { status: 404 });
  const [stage] = await db.select({ id: developmentStage.id, isTerminal: developmentStage.isTerminal, isCancelled: developmentStage.isCancelled }).from(developmentStage)
    .where(and(eq(developmentStage.id, stageId), eq(developmentStage.companyId, company.id), eq(developmentStage.isActive, true)));
  if (!stage) return Response.json({ error: "Etapa no encontrada" }, { status: 404 });
  if (stage.isTerminal || stage.isCancelled) return Response.json({ error: "Primero asigna otra etapa finalizada o cancelada." }, { status: 409 });
  const [used] = await db.select({ count: count() }).from(activity).where(eq(activity.developmentStageId, stageId));
  if ((used?.count ?? 0) > 0) return Response.json({ error: "No se puede eliminar: hay actividades asignadas a esta etapa." }, { status: 409 });
  await db.delete(developmentStage).where(and(eq(developmentStage.id, stageId), eq(developmentStage.companyId, company.id)));
  return new Response(null, { status: 204 });
}
