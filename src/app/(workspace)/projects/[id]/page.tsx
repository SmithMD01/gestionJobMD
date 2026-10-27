import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { companyMember, companyTeamMember } from "@/modules/companies/schema";
import { user } from "@/db/auth-schema";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { activity, developmentStage, project, projectContact, projectDocument, projectModule, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { activityResponsiblesInCompany } from "@/modules/projects/access";
import { ProjectSections } from "../project-sections";
import type { ProjectScheduleItem as ProjectScheduleItemType } from "../project-schedule";
import { ProjectStatusSelect } from "../project-status-select";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [item] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, company.id)));
  if (!item) notFound();
  const [contacts, activities, developmentStages, teamMembers, modules, scheduleRows, documents] = await Promise.all([
    db.select({ id: projectContact.id, name: projectContact.name, email: projectContact.email, phone: projectContact.phone })
      .from(projectContact).where(eq(projectContact.projectId, id)).orderBy(projectContact.name),
    db.select().from(activity).where(eq(activity.projectId, id)).orderBy(activity.createdAt),
    db.select({ id: developmentStage.id, name: developmentStage.name, color: developmentStage.color }).from(developmentStage).where(eq(developmentStage.isActive, true)).orderBy(developmentStage.sortOrder),
    db.select({ id: companyTeamMember.id, name: companyTeamMember.name, role: companyTeamMember.role }).from(companyTeamMember)
      .leftJoin(companyMember, and(eq(companyMember.companyId, companyTeamMember.companyId), eq(companyMember.userId, companyTeamMember.userId)))
      .leftJoin(user, eq(user.id, companyTeamMember.userId))
      .where(and(eq(companyTeamMember.companyId, company.id), or(isNull(companyTeamMember.userId), and(eq(companyMember.visibleInActivityAssignments, true), or(eq(user.banned, false), isNull(user.banned)))))).orderBy(companyTeamMember.name),
    db.select().from(projectModule).where(and(eq(projectModule.projectId, id), eq(projectModule.isActive, true))).orderBy(projectModule.sortOrder, projectModule.name),
    db.select().from(projectSchedule).where(eq(projectSchedule.projectId, id)),
    db.select({ id: projectDocument.id, projectId: projectDocument.projectId, groupId: projectDocument.groupId, typeId: projectDocument.typeId, title: projectDocument.title, version: projectDocument.version, status: projectDocument.status, isFinal: projectDocument.isFinal, fileName: projectDocument.fileName, mimeType: projectDocument.mimeType, fileSize: projectDocument.fileSize, notes: projectDocument.notes, createdBy: projectDocument.createdBy, createdAt: projectDocument.createdAt, updatedAt: projectDocument.updatedAt }).from(projectDocument).where(eq(projectDocument.projectId, id)).orderBy(desc(projectDocument.updatedAt), desc(projectDocument.version)),
  ]);
  const activityIds = activities.map((item) => item.id);
  const responsibleByActivity = await activityResponsiblesInCompany(activityIds, company.id);
  const activitiesWithResponsibles = activities.map((item) => ({ ...item, responsibleIds: responsibleByActivity.get(item.id)?.ids ?? [], responsibleNames: responsibleByActivity.get(item.id)?.names ?? [] }));
  const schedule = scheduleRows[0] ?? null;
  const scheduleItems = schedule ? await db.select().from(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, schedule.id)).orderBy(projectScheduleItem.sortOrder) : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">{company.name}</p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-ink sm:text-3xl">{item.name}</h1>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ProjectStatusSelect project={{ id: item.id, name: item.name, objective: item.objective, description: item.description, status: item.status, startDate: item.startDate, endDate: item.endDate }} />
          <Link href={`/projects/${item.id}/edit`} className="ui-button ui-button-secondary">Editar</Link>
        </div>
      </header>

      <ProjectSections projectId={item.id} contacts={contacts} activities={activitiesWithResponsibles} developmentStages={developmentStages} teamMembers={teamMembers} modules={modules} documents={documents} projectObjective={item.objective} projectDescription={item.description} projectCreatedAt={item.createdAt} projectUpdatedAt={item.updatedAt} projectStartDate={item.startDate} projectEndDate={item.endDate} schedule={schedule ? { id: schedule.id, status: schedule.status, confirmedAt: schedule.confirmedAt?.toISOString() ?? null } : null} scheduleItems={scheduleItems.map((row) => ({ id: row.id, title: row.title, description: row.description, color: row.color as ProjectScheduleItemType["color"], startDate: row.startDate, endDate: row.endDate, sortOrder: row.sortOrder }))} />

    </main>
  );
}
