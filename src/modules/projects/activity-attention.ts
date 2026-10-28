export const ACTIVITY_UPCOMING_DAYS = 10;

export type ActivityAttention = "overdue" | "urgent" | "upcoming";

export function currentDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function activityAttention(item: { priority: number; dueDate: string | null; status: string }, today: string): ActivityAttention | null {
  if (item.status === "completed" || item.status === "cancelled") return null;
  if (item.dueDate && item.dueDate < today) return "overdue";
  if (item.priority === 5) return "urgent";
  if (item.dueDate && item.dueDate <= addDays(today, ACTIVITY_UPCOMING_DAYS)) return "upcoming";
  return null;
}

function addDays(value: string, days: number) {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
