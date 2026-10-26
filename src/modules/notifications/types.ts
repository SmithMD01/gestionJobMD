export type WorkspaceNotification = {
  id: string;
  kind: "overdue" | "upcoming" | "urgent" | "schedule";
  title: string;
  detail: string;
  href: string;
};
