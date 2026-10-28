export type WorkspaceNotification = {
  id: string;
  kind: "overdue" | "upcoming" | "urgent" | "schedule";
  title: string;
  source: "activities" | "development" | "gantt";
  entityName: string;
  projectName: string;
  priority: number | null;
  date: string | null;
  daysRemaining: number | null;
  description: string | null;
  href: string;
};
