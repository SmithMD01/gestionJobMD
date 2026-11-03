import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notFound } from "next/navigation";
import { requireReadySession } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { hasModuleAccess } from "@/modules/access/permissions";
import { activity, developmentStage, project, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { ProjectsPanel } from "./projects-panel";
import { activityProgressPercent } from "@/modules/projects/activity-progress";

const generalStatusProgress = { to_validate: 0, pending: 0, in_progress: 50, blocked: 50, completed: 100, cancelled: 0 } as const;

export default async function ProjectsPage() {
  const session = await requireReadySession();
  const company = await activeCompanyForPage(session.user.id);
  if (!await hasModuleAccess(session.user.id, company.id, "projects", session.user.role)) notFound();
  const [projects, activities, stages] = await Promise.all([db.select({
    id: project.id, name: project.name, objective: project.objective, description: project.description, status: project.status,
    startDate: project.startDate, endDate: project.endDate,
  }).from(project).where(eq(project.companyId, company.id)).orderBy(desc(project.updatedAt)),
  db.select({ projectId: activity.projectId, type: activity.type, status: activity.status, developmentStageId: activity.developmentStageId, checklist: activity.checklist })
    .from(activity).innerJoin(project, eq(activity.projectId, project.id)).where(eq(project.companyId, company.id)),
  db.select({ id: developmentStage.id, name: developmentStage.name, isTerminal: developmentStage.isTerminal, isCancelled: developmentStage.isCancelled }).from(developmentStage).where(and(eq(developmentStage.companyId, company.id), eq(developmentStage.isActive, true))).orderBy(developmentStage.sortOrder)]);
  const scheduleItems = await db.select({ projectId: projectSchedule.projectId, status: projectScheduleItem.status })
    .from(projectScheduleItem).innerJoin(projectSchedule, eq(projectScheduleItem.scheduleId, projectSchedule.id))
    .innerJoin(project, eq(projectSchedule.projectId, project.id)).where(eq(project.companyId, company.id));
  const progressByProject = projects.map((item) => {
    const related = activities.filter((activityItem) => activityItem.projectId === item.id && activityItem.status !== "cancelled");
    const general = related.filter((activityItem) => activityItem.type !== "development");
    const development = related.filter((activityItem) => activityItem.type === "development");
    const completedGeneral = general.filter((activityItem) => activityItem.status === "completed").length;
    const completedDevelopment = development.filter((activityItem) => stages.some((stage) => stage.id === activityItem.developmentStageId && stage.isTerminal)).length;
    const total = general.length + development.length;
    const completed = completedGeneral + completedDevelopment;
    const progressStages = stages.filter((stage) => !stage.isCancelled);
    const activityProgress = related.map((activityItem) => {
      const fallback = activityItem.type === "development"
        ? (() => {
          const index = progressStages.findIndex((stage) => stage.id === activityItem.developmentStageId);
          return index < 0 ? 0 : progressStages[index].isTerminal ? 100 : Math.round(((index + 1) / progressStages.length) * 100);
        })()
        : generalStatusProgress[activityItem.status];
      return activityProgressPercent(activityItem.checklist, fallback);
    });
    return { projectId: item.id, generalCount: general.length, completedGeneral, developmentCount: development.length, completedDevelopment, total, completed, percent: total ? activityProgress.reduce((sum, value) => sum + value, 0) / total : 0 };
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <ProjectsPanel projects={projects.map((item) => ({ ...item, progress: progressByProject.find((progress) => progress.projectId === item.id)!, scheduleCount: scheduleItems.filter((row) => row.projectId === item.id).length, scheduleCompleted: scheduleItems.filter((row) => row.projectId === item.id && row.status === "completed").length }))} companyName={company.name} readOnly={!company.isActive || session.user.role !== "admin"} />
    </main>
  );
}
