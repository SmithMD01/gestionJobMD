"use client";

import type { ProjectActivity } from "./project-activities";
import type { ProjectScheduleItem } from "./project-schedule";

type Stage = { id: string; name: string; color: string };

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "Sin fecha";
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
}

function addDays(value: string, days: number) {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function UpcomingList({ items }: { items: ProjectActivity[] }) {
  return items.length ? <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">{items.slice(0, 3).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="min-w-0 truncate text-ink" title={item.title}>{item.title}</span><span className="shrink-0 tabular-nums text-muted">{formatDate(item.dueDate)}</span></li>)}</ul> : <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-subtle">No hay próximos vencimientos.</p>;
}

function ActivityGroup({ title, items, development, stages }: { title: string; items: ProjectActivity[]; development: boolean; stages: Stage[] }) {
  const today = dateKey(new Date());
  const upcomingLimit = addDays(today, 7);
  const active = items.filter((item) => item.status !== "cancelled");
  const pending = active.filter((item) => item.status !== "completed").length;
  const hours = active.reduce((total, item) => total + (item.hours ?? 0), 0);
  const overdue = active.filter((item) => item.dueDate && item.dueDate < today && item.status !== "completed").length;
  const upcoming = active.filter((item) => item.dueDate && item.dueDate >= today && item.dueDate <= upcomingLimit).toSorted((left, right) => (left.dueDate ?? "9999").localeCompare(right.dueDate ?? "9999"));
  const completed = active.filter((item) => item.status === "completed").length;
  const progress = active.length ? Math.round((completed / active.length) * 100) : 0;
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));
  const stageCounts = Array.from(new Set(active.map((item) => item.developmentStageId ?? "none"))).map((stageId) => ({ name: stageId === "none" ? "Sin etapa" : stageNames.get(stageId) ?? "Etapa no disponible", count: active.filter((item) => (item.developmentStageId ?? "none") === stageId).length })).sort((left, right) => right.count - left.count);

  return <article className="rounded-lg border border-line bg-canvas p-3">
    <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-ink">{title}</h4><span className="text-[11px] text-subtle">{active.length} registradas</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">{development ? "En etapas" : "Pendientes"}</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{pending}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Horas</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{hours}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Próximas</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{upcoming.length}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Vencidas</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{overdue}</p></div>
    </div>
    {!development && <div className="mt-3"><div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-subtle">Avance completado</span><span className="font-semibold tabular-nums text-ink">{progress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} /></div></div>}
    {development && <div className="mt-3"><p className="text-[11px] text-subtle">Distribución por etapa</p><div className="mt-1.5 flex flex-wrap gap-1.5">{stageCounts.length ? stageCounts.slice(0, 5).map((stage) => <span key={stage.name} className="rounded-full border border-line bg-surface px-2 py-1 text-[10px] text-muted">{stage.name}: {stage.count}</span>) : <span className="text-[11px] text-subtle">Sin actividades de desarrollo.</span>}</div></div>}
    <p className="mt-3 text-[11px] font-medium text-subtle">Próximos vencimientos</p><UpcomingList items={upcoming} />
  </article>;
}

export function ProjectFollowUp({ activities, scheduleItems, stages, startDate, endDate }: { activities: ProjectActivity[]; scheduleItems: ProjectScheduleItem[]; stages: Stage[]; startDate: string | null; endDate: string | null }) {
  const today = dateKey(new Date());
  const datedSchedule = scheduleItems.filter((item) => item.startDate || item.endDate).toSorted((left, right) => (left.startDate ?? left.endDate ?? "9999").localeCompare(right.startDate ?? right.endDate ?? "9999"));
  const currentStage = datedSchedule.find((item) => (item.startDate ?? item.endDate!) <= today && (item.endDate ?? item.startDate!) >= today) ?? null;
  const nextStage = datedSchedule.find((item) => (item.startDate ?? item.endDate!) > today) ?? null;
  const stageToShow = currentStage ?? nextStage ?? datedSchedule.at(-1) ?? null;
  const stageDays = currentStage?.endDate ? daysBetween(today, currentStage.endDate) : null;
  const nextStageDays = nextStage?.startDate ? daysBetween(today, nextStage.startDate) : null;
  const projectProgress = startDate && endDate && endDate > startDate ? Math.max(0, Math.min(100, Math.round((daysBetween(startDate, today) / daysBetween(startDate, endDate)) * 100))) : null;
  const generalActivities = activities.filter((item) => item.type !== "development");
  const developmentActivities = activities.filter((item) => item.type === "development");

  return <section className="mt-6 border-t border-line pt-5" aria-labelledby="project-follow-up">
    <div><h3 id="project-follow-up" className="text-sm font-semibold">Seguimiento del proyecto</h3><p className="mt-1 text-xs text-subtle">Indicadores separados para actividades, desarrollo y cronograma.</p></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2"><ActivityGroup title="Actividades" items={generalActivities} development={false} stages={stages} /><ActivityGroup title="Desarrollo" items={developmentActivities} development={true} stages={stages} /></div>
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-line bg-canvas px-3 py-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-ink">Avance temporal del proyecto</p><span className="text-xs font-semibold tabular-nums text-ink">{projectProgress === null ? "—" : `${projectProgress}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-success" style={{ width: `${projectProgress ?? 0}%` }} /></div><p className="mt-2 text-[11px] text-subtle">{startDate && endDate ? `${formatDate(startDate)} – ${formatDate(endDate)}` : "Registra fecha de inicio y fin para calcularlo."}</p></div>
      <div className="rounded-lg border border-line bg-canvas px-3 py-3"><p className="text-xs font-medium text-ink">Etapa del cronograma</p><p className="mt-1 text-sm font-semibold text-ink">{stageToShow?.title ?? "Sin cronograma con fechas"}</p><p className="mt-0.5 text-[11px] text-subtle">{currentStage ? `Etapa actual · ${stageDays === 0 ? "termina hoy" : `${stageDays} días restantes`}` : nextStage ? `Próxima etapa · ${nextStageDays === 0 ? "comienza hoy" : `comienza en ${nextStageDays} días`}` : stageToShow ? "Cronograma finalizado según las fechas registradas." : "Añade fechas para calcular la etapa actual."}</p><p className="mt-1 text-[11px] text-muted">{stageToShow ? `${formatDate(stageToShow.startDate ?? stageToShow.endDate)} – ${formatDate(stageToShow.endDate ?? stageToShow.startDate)}` : ""}</p></div>
    </div>
  </section>;
}
