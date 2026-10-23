import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { company, companyMember } from "@/modules/companies/schema";
import { ACTIVE_COMPANY_COOKIE, companiesForUser, companyCookieOptions } from "@/modules/companies/context";

const companyInput = z.object({ name: z.string().trim().min(1).max(120) });

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

  const created = await db.transaction(async (tx) => {
    const [newCompany] = await tx.insert(company).values({ name: parsed.data.name, createdBy: session.user.id }).returning();
    await tx.insert(companyMember).values({ companyId: newCompany.id, userId: session.user.id });
    return newCompany;
  });
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, created.id, companyCookieOptions());
  return Response.json({ company: created }, { status: 201 });
}
