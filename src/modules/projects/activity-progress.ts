import { parseChecklist } from "./checklist";

/** Returns checklist completion as a percentage, or null when there are no rows. */
export function checklistProgressPercent(checklist: string | null | undefined): number | null {
  const items = parseChecklist(checklist);
  if (!items.length) return null;
  const completed = items.filter((item) => item.done).length;
  return Math.round((completed / items.length) * 1000) / 10;
}

/** A checklist overrides status/stage progress when it contains at least one row. */
export function activityProgressPercent(checklist: string | null | undefined, fallbackPercent: number): number {
  return checklistProgressPercent(checklist) ?? fallbackPercent;
}

export function formatProgressPercent(percent: number): string {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(percent);
}
