import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-session";
import { UsersPanel } from "./users-panel";
import { activeCompanyForPage } from "@/modules/companies/context";
import { appRole, companyUserRole } from "@/modules/access/schema";
import { companyMember } from "@/modules/companies/schema";
import { db } from "@/db/client";
import { and, asc, eq } from "drizzle-orm";

export default async function UsersPage() {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const result = await auth.api.listUsers({ query: { limit: 20, offset: 0, sortBy: "createdAt", sortDirection: "desc" }, headers: await headers() });
  const [members, assignments] = await Promise.all([
    db.select({ userId: companyMember.userId }).from(companyMember).where(eq(companyMember.companyId, company.id)),
    db.select({ userId: companyUserRole.userId, roleId: companyUserRole.roleId, roleName: appRole.name }).from(companyUserRole)
      .innerJoin(appRole, eq(companyUserRole.roleId, appRole.id)).where(eq(companyUserRole.companyId, company.id)),
  ]);
  const availableRoles = await db.select({ id: appRole.id, name: appRole.name, key: appRole.key }).from(appRole)
    .where(and(eq(appRole.companyId, company.id), eq(appRole.isActive, true))).orderBy(asc(appRole.name));
  const eligibleUserIds = members.map((item) => item.userId);
  const roleAssignments = Object.fromEntries(assignments.map((item) => [item.userId, { roleId: item.roleId, roleName: item.roleName }]));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <UsersPanel currentUserId={session.user.id} initialUsers={result.users} initialTotal={result.total} eligibleUserIds={eligibleUserIds} roleAssignments={roleAssignments} assignableRoles={availableRoles.filter((role) => role.key !== "admin").map(({ id, name }) => ({ id, name }))} />
    </main>
  );
}
