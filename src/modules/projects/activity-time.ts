export type ActivityTimeEntry = {
  id: string;
  minutes: number;
  loggedByName: string;
  createdAt: string | Date;
};

export function formatActivityDuration(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export function activityActualMinutes(entries: ActivityTimeEntry[] | undefined) {
  return entries?.reduce((total, entry) => total + entry.minutes, 0) ?? 0;
}

export function formatActivityEstimate(hours: number | null | undefined) {
  return hours === null || hours === undefined ? "—" : formatActivityDuration(hours * 60);
}

export function activityCompletionDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function completionDateTimestamp(date: string | null | undefined) {
  return date ? new Date(`${date}T17:00:00.000Z`) : null;
}
