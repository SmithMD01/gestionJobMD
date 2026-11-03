import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { activity, developmentStage, project, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { ProjectsPanel } from "./projects-panel";

export default async function ProjectsPage() {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const [projects, activities, stages] = await Promise.all([db.select({
    id: project.id, name: project.name, objective: project.objective, description: project.description, status: project.status,
    startDate: project.startDate, endDate: project.endDate,
  }).from(project).where(eq(project.companyId, company.id)).orderBy(desc(project.updatedAt)),
  db.select({ projectId: activity.projectId, type: activity.type, status: activity.status, developmentStageId: activity.developmentStageId })
    .from(activity).innerJoin(project, eq(activity.projectId, project.id)).where(eq(project.companyId, company.id)),
  db.select({ id: developmentStage.id, name: developmentStage.name }).from(developmentStage).where(eq(developmentStage.isActive, true)).orderBy(developmentStage.sortOrder)]);
  const scheduleItems = await db.select({ projectId: projectSchedule.projectId, status: projectScheduleItem.status })
    .from(projectScheduleItem).innerJoin(projectSchedule, eq(projectScheduleItem.scheduleId, projectSchedule.id))
    .innerJoin(project, eq(projectSchedule.projectId, project.id)).where(eq(project.companyId, company.id));
  const progressByProject = projects.map((item) => {
    const related = activities.filter((activityItem) => activityItem.projectId === item.id && activityItem.status !== "cancelled");
    const general = related.filter((activityItem) => activityItem.type !== "development");
    const development = related.filter((activityItem) => activityItem.type === "development");
    const completedGeneral = general.filter((activityItem) => activityItem.status === "completed").length;
    const activeStages = stages.filter((stage) => stage.name.toLocaleLowerCase() !== "canceladas");
    const stagePositions = new Map(activeStages.map((stage, index) => [stage.id, index + 1]));
    const completedDevelopment = development.filter((activityItem) => (stagePositions.get(activityItem.developmentStageId ?? "") ?? 0) >= activeStages.length && activeStages.length > 0).length;
    const total = general.length + development.length;
    const completed = completedGeneral + completedDevelopment;
    return { projectId: item.id, generalCount: general.length, completedGeneral, developmentCount: development.length, completedDevelopment, total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <ProjectsPanel projects={projects.map((item) => ({ ...item, progress: progressByProject.find((progress) => progress.projectId === item.id)!, scheduleCount: scheduleItems.filter((row) => row.projectId === item.id).length, scheduleCompleted: scheduleItems.filter((row) => row.projectId === item.id && row.status === "completed").length }))} companyName={company.name} readOnly={!company.isActive} />
    </main>
  );
}
