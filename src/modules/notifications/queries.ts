import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { activity, project, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { activityAttention } from "@/modules/projects/activity-attention";
import type { WorkspaceNotification } from "./types";

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function daysBetween(from: string, to: string) {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toTime - fromTime) / 86_400_000);
}

export async function notificationsForCompany(companyId: string): Promise<WorkspaceNotification[]> {
  const today = dateKey(new Date());
  const [activityRows, scheduleRows] = await Promise.all([
    db.select({ id: activity.id, projectId: activity.projectId, projectName: project.name, title: activity.title, type: activity.type, status: activity.status, priority: activity.priority, dueDate: activity.dueDate, description: activity.observations })
      .from(activity)
      .innerJoin(project, eq(activity.projectId, project.id))
      .where(and(eq(project.companyId, companyId), ne(activity.status, "completed"), ne(activity.status, "cancelled"))),
    db.select({ id: projectScheduleItem.id, projectId: project.id, projectName: project.name, title: projectScheduleItem.title, description: projectScheduleItem.description, kind: projectScheduleItem.kind, status: projectScheduleItem.status, startDate: projectScheduleItem.startDate, endDate: projectScheduleItem.endDate, sortOrder: projectScheduleItem.sortOrder })
      .from(projectScheduleItem)
      .innerJoin(projectSchedule, eq(projectScheduleItem.scheduleId, projectSchedule.id))
      .innerJoin(project, eq(projectSchedule.projectId, project.id))
      .where(eq(project.companyId, companyId)),
  ]);

  const notifications: WorkspaceNotification[] = [];
  for (const item of activityRows) {
    const kind = activityAttention(item, today);
    if (!kind) continue;
    const development = item.type === "development" ? " de desarrollo" : "";
    const title = kind === "overdue" ? `Actividad${development} vencida`
      : kind === "urgent" ? `Actividad${development} urgente`
        : `Actividad${development} próxima a vencer`;
    notifications.push({ id: `activity-${item.id}`, kind, title, source: item.type === "development" ? "development" : "activities", entityName: item.title, projectName: item.projectName, priority: item.priority, date: item.dueDate, daysRemaining: item.dueDate ? daysBetween(today, item.dueDate) : null, description: item.description || null, href: `/projects/${item.projectId}` });
  }

  const scheduleByProject = new Map<string, typeof scheduleRows>();
  for (const item of scheduleRows) {
    const projectItems = scheduleByProject.get(item.projectId) ?? [];
    projectItems.push(item);
    scheduleByProject.set(item.projectId, projectItems);
  }

  for (const [projectId, projectItems] of scheduleByProject) {
    const currentPhase = projectItems
      .filter((item) => item.kind === "phase" && item.status !== "completed" && item.startDate && item.endDate && item.startDate <= today && item.endDate >= today)
      .sort((left, right) => right.startDate!.localeCompare(left.startDate!) || left.sortOrder - right.sortOrder)[0];
    if (currentPhase) {
      notifications.push({ id: `schedule-current-${currentPhase.id}`, kind: "schedule", title: "Etapa actual del Gantt", source: "gantt", entityName: currentPhase.title, projectName: currentPhase.projectName, priority: null, date: currentPhase.endDate, daysRemaining: daysBetween(today, currentPhase.endDate!), description: currentPhase.description || null, href: `/projects/${projectId}` });
    }

    const oldestOverdueActivity = projectItems
      .filter((item) => item.kind === "activity" && item.status !== "completed" && item.endDate && item.endDate < today)
      .sort((left, right) => left.endDate!.localeCompare(right.endDate!) || left.sortOrder - right.sortOrder)[0];
    if (oldestOverdueActivity) {
      notifications.push({ id: `schedule-activity-overdue-${oldestOverdueActivity.id}`, kind: "schedule", title: "Actividad del Gantt vencida", source: "gantt", entityName: oldestOverdueActivity.title, projectName: oldestOverdueActivity.projectName, priority: null, date: oldestOverdueActivity.endDate, daysRemaining: daysBetween(today, oldestOverdueActivity.endDate!), description: oldestOverdueActivity.description || null, href: `/projects/${projectId}` });
    }
  }

  const order: Record<WorkspaceNotification["kind"], number> = { overdue: 0, urgent: 1, schedule: 2, upcoming: 3 };
  return notifications.toSorted((left, right) => order[left.kind] - order[right.kind] || (left.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (right.daysRemaining ?? Number.MAX_SAFE_INTEGER) || left.entityName.localeCompare(right.entityName)).slice(0, 30);
}
