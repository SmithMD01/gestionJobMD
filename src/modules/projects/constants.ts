export type ProjectStatus = "planned" | "active" | "paused" | "completed" | "cancelled";

export const projectStatusLabel: Record<ProjectStatus, string> = {
  planned: "Planificado",
  active: "En curso",
  paused: "En pausa",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function formatProjectDate(value: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(year, month - 1, day));
}
