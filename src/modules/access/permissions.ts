import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { companyMember } from "@/modules/companies/schema";
import { appRole, companyUserRole, roleModulePermission } from "./schema";
import { MODULE_CATALOG, MODULE_CATALOG_BY_KEY, type ModulePermissionKey } from "./catalog";

export type ModuleAccessMap = Record<ModulePermissionKey, boolean>;

function emptyAccessMap(): ModuleAccessMap {
  return Object.fromEntries(MODULE_CATALOG.map((entry) => [entry.key, false])) as ModuleAccessMap;
}

/** Resolves the selected role's module visibility inside one active company. */
export async function moduleAccessForUser(userId: string, companyId: string | undefined, role?: string | null): Promise<ModuleAccessMap> {
  const access = emptyAccessMap();
  if (!companyId) return access;

  let roleId: string | undefined;
  if (role === "admin") {
    const [adminRole] = await db.select({ roleId: appRole.id }).from(appRole)
      .where(and(eq(appRole.companyId, companyId), eq(appRole.key, "admin"), eq(appRole.isActive, true)));
    roleId = adminRole?.roleId;
    if (!roleId) {
      for (const entry of MODULE_CATALOG) access[entry.key] = true;
      return access;
    }
  } else {
    const [account] = await db.select({ banned: user.banned }).from(user).where(eq(user.id, userId));
    if (!account || account.banned) return access;
    const [membership] = await db.select({ userId: companyMember.userId })
      .from(companyMember)
      .where(and(eq(companyMember.companyId, companyId), eq(companyMember.userId, userId)));
    if (!membership) return access;
    const [assignment] = await db.select({ roleId: companyUserRole.roleId })
      .from(companyUserRole)
      .innerJoin(appRole, eq(companyUserRole.roleId, appRole.id))
      .where(and(
        eq(companyUserRole.companyId, companyId),
        eq(companyUserRole.userId, userId),
        eq(appRole.companyId, companyId),
        eq(appRole.isActive, true),
      ));
    roleId = assignment?.roleId;
  }

  if (!roleId && role !== "admin") {
    access.home = true;
    access.companies = true;
    return access;
  }

  const permissions = roleId ? await db.select({ moduleKey: roleModulePermission.moduleKey })
    .from(roleModulePermission)
    .where(and(eq(roleModulePermission.roleId, roleId), eq(roleModulePermission.canAccess, true))) : [];

  for (const permission of permissions) {
    const entry = MODULE_CATALOG_BY_KEY[permission.moduleKey as ModulePermissionKey];
    if (entry && (role === "admin" || !entry.adminOnly)) access[entry.key] = true;
  }
  if (role === "admin") {
    for (const entry of MODULE_CATALOG) {
      if (entry.requiredForAdmin || entry.adminOnly) access[entry.key] = true;
    }
  }
  return access;
}

export async function hasModuleAccess(userId: string, companyId: string | undefined, moduleKey: ModulePermissionKey, role?: string | null) {
  const access = await moduleAccessForUser(userId, companyId, role);
  return access[moduleKey];
}

export async function userCanAccessCompanyModule(userId: string, companyId: string, moduleKey: ModulePermissionKey) {
  const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return hasModuleAccess(userId, companyId, moduleKey, account?.role);
}
