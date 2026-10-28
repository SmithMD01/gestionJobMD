import { asc, and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { company, companyMember } from "./schema";

export const ACTIVE_COMPANY_COOKIE = "active_company";

export async function companiesForUser(userId: string) {
  return db.select({ id: company.id, name: company.name, isActive: company.isActive })
    .from(companyMember)
    .innerJoin(company, eq(companyMember.companyId, company.id))
    .where(and(eq(companyMember.userId, userId), eq(company.isActive, true)))
    .orderBy(asc(company.createdAt), asc(company.id));
}

export async function companiesForManagement(userId: string) {
  return db.select({ id: company.id, name: company.name, isActive: company.isActive })
    .from(companyMember)
    .innerJoin(company, eq(companyMember.companyId, company.id))
    .where(eq(companyMember.userId, userId))
    .orderBy(asc(company.createdAt), asc(company.id));
}

export async function usersForCompanyAssignment() {
  return db.select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned })
    .from(user)
    .orderBy(asc(user.name), asc(user.email));
}

export async function membersForCompanies(companyIds: string[]) {
  if (!companyIds.length) return [];
  return db.select({ companyId: companyMember.companyId, userId: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, visibleInActivityAssignments: companyMember.visibleInActivityAssignments })
    .from(companyMember)
    .innerJoin(user, eq(companyMember.userId, user.id))
    .where(inArray(companyMember.companyId, companyIds))
    .orderBy(asc(user.name), asc(user.email));
}

export async function activeCompanyForUser(userId: string, selectedId?: string) {
  if (selectedId) {
    if (!z.uuid().safeParse(selectedId).success) return null;
    const [selected] = await db.select({ id: company.id, name: company.name, isActive: company.isActive })
      .from(companyMember)
      .innerJoin(company, eq(companyMember.companyId, company.id))
      .where(and(eq(companyMember.userId, userId), eq(company.id, selectedId)));
    return selected ?? null;
  }
  const [first] = await companiesForUser(userId);
  return first ?? null;
}

export async function selectableCompanyForUser(userId: string, selectedId: string) {
  const [selected] = await db.select({ id: company.id, name: company.name })
    .from(companyMember)
    .innerJoin(company, eq(companyMember.companyId, company.id))
    .where(and(eq(companyMember.userId, userId), eq(company.id, selectedId), eq(company.isActive, true)));
  return selected ?? null;
}

export async function activeCompanyForPage(userId: string) {
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const active = await activeCompanyForUser(userId, selectedId);
  if (!active) redirect("/companies");
  return active;
}

export function companyCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };
}
