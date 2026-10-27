import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { companyMember, companyTeamMember } from "../companies/schema";
import { activityResponsible, project, projectModule } from "./schema";

export async function projectInCompany(projectId: string, companyId: string) {
  const [found] = await db.select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.companyId, companyId)))
    .limit(1);
  return found ?? null;
}

export async function moduleInProject(moduleId: string, projectId: string) {
  const [found] = await db.select({ id: projectModule.id, name: projectModule.name, parentId: projectModule.parentId })
    .from(projectModule)
    .where(and(eq(projectModule.id, moduleId), eq(projectModule.projectId, projectId), eq(projectModule.isActive, true)))
    .limit(1);
  return found ?? null;
}

export async function teamMemberIdsInCompany(ids: string[], companyId: string) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return [];
  const rows = await db.select({ id: companyTeamMember.id })
    .from(companyTeamMember)
    .leftJoin(companyMember, and(eq(companyMember.companyId, companyTeamMember.companyId), eq(companyMember.userId, companyTeamMember.userId)))
    .leftJoin(user, eq(user.id, companyTeamMember.userId))
    .where(and(eq(companyTeamMember.companyId, companyId), inArray(companyTeamMember.id, uniqueIds), or(isNull(companyTeamMember.userId), and(eq(companyMember.visibleInActivityAssignments, true), or(eq(user.banned, false), isNull(user.banned))))));
  return rows.map((row) => row.id);
}

export async function activityResponsiblesInCompany(activityIds: string[], companyId: string) {
  if (!activityIds.length) return new Map<string, { ids: string[]; names: string[] }>();
  const rows = await db.select({ activityId: activityResponsible.activityId, teamMemberId: activityResponsible.teamMemberId, name: companyTeamMember.name })
    .from(activityResponsible)
    .innerJoin(companyTeamMember, eq(companyTeamMember.id, activityResponsible.teamMemberId))
    .where(and(inArray(activityResponsible.activityId, activityIds), eq(companyTeamMember.companyId, companyId)));
  const result = new Map<string, { ids: string[]; names: string[] }>();
  for (const row of rows) {
    const current = result.get(row.activityId) ?? { ids: [], names: [] };
    current.ids.push(row.teamMemberId);
    current.names.push(row.name);
    result.set(row.activityId, current);
  }
  return result;
}
