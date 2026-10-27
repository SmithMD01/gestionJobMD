import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { company, companyMember, companyTeamMember } from "@/modules/companies/schema";
import { ACTIVE_COMPANY_COOKIE, companiesForUser, companyCookieOptions } from "@/modules/companies/context";
import { auditEvent } from "@/modules/audit/schema";
import { createdDetail } from "@/modules/audit/details";

const companyInput = z.object({ name: z.string().trim().min(1).max(120), memberIds: z.array(z.string().min(1)).max(500).default([]) });

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  return Response.json({ companies: await companiesForUser(session.user.id) });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = companyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escribe un nombre de empresa válido" }, { status: 400 });
  const memberIds = [...new Set([session.user.id, ...parsed.data.memberIds])];
  const existingUsers = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).where(inArray(user.id, memberIds));
  if (existingUsers.length !== memberIds.length) return Response.json({ error: "Uno o más usuarios seleccionados no existen" }, { status: 400 });

  const created = await db.transaction(async (tx) => {
    const [newCompany] = await tx.insert(company).values({ name: parsed.data.name, createdBy: session.user.id }).returning();
    await tx.insert(companyMember).values(memberIds.map((userId) => ({ companyId: newCompany.id, userId, visibleInActivityAssignments: false })));
    await tx.insert(companyTeamMember).values(existingUsers.map((member) => ({ companyId: newCompany.id, userId: member.id, name: member.name, email: member.email, role: member.role })));
    await tx.insert(auditEvent).values({ companyId: newCompany.id, actorUserId: session.user.id, entityType: "company", entityId: newCompany.id, entityName: newCompany.name, action: "company.created", changeDetail: createdDetail("la empresa", newCompany.name) });
    return newCompany;
  });
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, created.id, companyCookieOptions());
  return Response.json({ company: created }, { status: 201 });
}
