import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { activity, project, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import type { WorkspaceNotification } from "./types";

const UPCOMING_DAYS = 7;

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(value: string, days: number) {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export async function notificationsForCompany(companyId: string): Promise<WorkspaceNotification[]> {
  const today = dateKey(new Date());
  const upcomingLimit = addDays(today, UPCOMING_DAYS);
  const [activityRows, scheduleRows] = await Promise.all([
    db.select({ id: activity.id, projectId: activity.projectId, projectName: project.name, title: activity.title, type: activity.type, status: activity.status, priority: activity.priority, dueDate: activity.dueDate })
      .from(activity)
      .innerJoin(project, eq(activity.projectId, project.id))
      .where(and(eq(project.companyId, companyId), ne(activity.status, "completed"), ne(activity.status, "cancelled"))),
    db.select({ id: projectScheduleItem.id, projectId: project.id, projectName: project.name, title: projectScheduleItem.title, endDate: projectScheduleItem.endDate })
      .from(projectScheduleItem)
      .innerJoin(projectSchedule, eq(projectScheduleItem.scheduleId, projectSchedule.id))
      .innerJoin(project, eq(projectSchedule.projectId, project.id))
      .where(eq(project.companyId, companyId)),
  ]);

  const notifications: WorkspaceNotification[] = [];
  for (const item of activityRows) {
    const kind = item.dueDate && item.dueDate < today ? "overdue"
      : item.priority === 5 ? "urgent"
        : item.dueDate && item.dueDate <= upcomingLimit ? "upcoming" : null;
    if (!kind) continue;
    const development = item.type === "development" ? " de desarrollo" : "";
    const title = kind === "overdue" ? `Actividad${development} vencida`
      : kind === "urgent" ? `Actividad${development} urgente`
        : `Actividad${development} próxima a vencer`;
    const detail = item.dueDate ? `${item.title} · ${item.projectName} · límite ${item.dueDate}` : `${item.title} · ${item.projectName}`;
    notifications.push({ id: `activity-${item.id}`, kind, title, detail, href: `/projects/${item.projectId}` });
  }

  for (const item of scheduleRows) {
    if (!item.endDate) continue;
    if (item.endDate < today) notifications.push({ id: `schedule-overdue-${item.id}`, kind: "schedule", title: "Etapa del cronograma vencida", detail: `${item.title} · ${item.projectName} · terminó ${item.endDate}`, href: `/projects/${item.projectId}` });
    else if (item.endDate <= upcomingLimit) notifications.push({ id: `schedule-${item.id}`, kind: "schedule", title: "Etapa del cronograma por terminar", detail: `${item.title} · ${item.projectName} · termina ${item.endDate}`, href: `/projects/${item.projectId}` });
  }

  const order: Record<WorkspaceNotification["kind"], number> = { overdue: 0, urgent: 1, schedule: 2, upcoming: 3 };
  return notifications.toSorted((left, right) => order[left.kind] - order[right.kind] || left.detail.localeCompare(right.detail)).slice(0, 30);
}
