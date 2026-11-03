import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-session";
import { db } from "@/db/client";
import { activeCompanyForPage } from "@/modules/companies/context";
import { appRole, roleModulePermission } from "@/modules/access/schema";
import { RolesPanel, type RoleRow } from "./roles-panel";

export default async function RolesPage() {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const [roles, permissions] = await Promise.all([
    db.select({ id: appRole.id, key: appRole.key, name: appRole.name, description: appRole.description, isSystem: appRole.isSystem, isActive: appRole.isActive })
      .from(appRole)
      .where(eq(appRole.companyId, company.id))
      .orderBy(asc(appRole.name)),
    db.select({ roleId: roleModulePermission.roleId, moduleKey: roleModulePermission.moduleKey })
      .from(roleModulePermission)
      .innerJoin(appRole, eq(roleModulePermission.roleId, appRole.id))
      .where(eq(appRole.companyId, company.id)),
  ]);
  const permissionsByRole = new Map<string, string[]>();
  for (const permission of permissions) {
    const current = permissionsByRole.get(permission.roleId) ?? [];
    current.push(permission.moduleKey);
    permissionsByRole.set(permission.roleId, current);
  }
  const initialRoles: RoleRow[] = roles.map((role) => ({
    ...role,
    description: role.description ?? "",
    moduleKeys: permissionsByRole.get(role.id) ?? [],
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <RolesPanel companyName={company.name} initialRoles={initialRoles} />
    </main>
  );
}
