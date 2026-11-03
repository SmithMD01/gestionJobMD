import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { appRole } from "@/modules/access/schema";
import { activeCompanyForUser } from "@/modules/companies/context";
import { auditEvent } from "@/modules/audit/schema";
import { createdDetail } from "@/modules/audit/details";

const roleInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().default(""),
}).strict();

async function adminSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin" || !session.user.twoFactorEnabled) return null;
  return session;
}

export async function GET(request: Request) {
  const session = await adminSession(request);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 403 });
  const companyId = new URL(request.url).searchParams.get("companyId") ?? undefined;
  const company = await activeCompanyForUser(session.user.id, companyId);
  if (!company) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
  const roles = await db.select().from(appRole).where(eq(appRole.companyId, company.id)).orderBy(asc(appRole.name));
  return Response.json({ roles });
}

export async function POST(request: Request) {
  const session = await adminSession(request);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 403 });
  const payload = await request.json().catch(() => null);
  const parsed = roleInput.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Completa un nombre de rol válido." }, { status: 400 });
  const company = await activeCompanyForUser(session.user.id);
  if (!company) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });

  const [role] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(appRole).values({
      companyId: company.id,
      key: `custom_${crypto.randomUUID()}`,
      name: parsed.data.name,
      description: parsed.data.description || null,
      createdBy: session.user.id,
    }).returning();
    if (!created) return [];
    await tx.insert(auditEvent).values({
      companyId: company.id,
      actorUserId: session.user.id,
      entityType: "role",
      entityId: created.id,
      entityName: created.name,
      action: "role.created",
      changeDetail: createdDetail("el rol", created.name),
    });
    return [created];
  });
  if (!role) return Response.json({ error: "No se pudo crear el rol." }, { status: 500 });
  return Response.json({ role }, { status: 201 });
}
