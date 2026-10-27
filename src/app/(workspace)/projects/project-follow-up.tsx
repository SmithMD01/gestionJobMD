"use client";

import { statusLabels, StatusBadge, type ProjectActivity } from "./project-activities";
import type { ProjectScheduleItem } from "./project-schedule";
import { DataTable, type TableColumn } from "@/components/tables/data-table";

type Stage = { id: string; name: string; color: string };
type ProjectModule = { id: string; parentId: string | null; name: string };

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

function stageColor(color: string) {
  return ({ blue: "bg-blue-500", violet: "bg-violet-500", amber: "bg-amber-500", green: "bg-green-500", neutral: "bg-slate-400" }[color] ?? "bg-slate-400");
}

const activityProgress: Record<ProjectActivity["status"], number> = { to_validate: 0, pending: 0, in_progress: 50, blocked: 50, completed: 100, cancelled: 0 };

function progressFor(item: ProjectActivity, development: boolean, stages: Stage[]) {
  if (!development) return { label: statusLabels[item.status], percent: activityProgress[item.status] };
  const progressStages = stages.filter((stage) => stage.id !== "cancelled" && stage.name.toLocaleLowerCase() !== "canceladas");
  const stageIndex = progressStages.findIndex((stage) => stage.id === item.developmentStageId);
  const percent = stageIndex < 0 || progressStages.length === 0 ? 0 : Math.round(((stageIndex + 1) / progressStages.length) * 100);
  return { label: stageIndex < 0 ? "Sin etapa" : progressStages[stageIndex].name, percent };
}

function dueLabel(today: string, dueDate: string | null) {
  if (!dueDate) return "—";
  const days = daysBetween(today, dueDate);
  if (days < 0) return `${Math.abs(days)} d vencida${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Hoy";
  return `${days} d`;
}

const scheduleStatusLabels: Record<ProjectScheduleItem["status"], string> = { planned: "Pendiente", in_progress: "En desarrollo", completed: "Completada" };

function scheduleProgress(item: ProjectScheduleItem, today: string) {
  if (item.status === "completed") return 100;
  if (item.status !== "in_progress" || !item.startDate || !item.endDate || item.endDate <= item.startDate) return 0;
  return Math.max(0, Math.min(100, Math.round((daysBetween(item.startDate, today) / daysBetween(item.startDate, item.endDate)) * 100)));
}

function ActivityGroup({ title, items, development, stages }: { title: string; items: ProjectActivity[]; development: boolean; stages: Stage[] }) {
  const today = dateKey(new Date());
  const upcomingLimit = addDays(today, 10);
  const active = items.filter((item) => item.status !== "cancelled");
  const pending = active.filter((item) => item.status !== "completed").length;
  const hours = active.reduce((total, item) => total + (item.hours ?? 0), 0);
  const overdue = active.filter((item) => item.dueDate && item.dueDate < today && item.status !== "completed").length;
  const trackable = active.filter((item) => item.status !== "completed");
  const isAttention = (item: ProjectActivity) => item.priority === 5 || Boolean(item.dueDate && item.dueDate <= upcomingLimit);
  const attentionItems = trackable.filter(isAttention);
  const hasAttention = attentionItems.length > 0;
  const tableItems = [...trackable].sort((left, right) => {
    const leftAttention = isAttention(left) ? 1 : 0;
    const rightAttention = isAttention(right) ? 1 : 0;
    if (leftAttention !== rightAttention) return rightAttention - leftAttention;
    if (left.dueDate !== right.dueDate) return (left.dueDate ?? "9999").localeCompare(right.dueDate ?? "9999");
    return right.priority - left.priority;
  });
  const completed = active.filter((item) => item.status === "completed").length;
  const progress = active.length ? Math.round((completed / active.length) * 100) : 0;
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));
  const stageCounts = Array.from(new Set(active.map((item) => item.developmentStageId ?? "none"))).map((stageId) => ({ name: stageId === "none" ? "Sin etapa" : stageNames.get(stageId) ?? "Etapa no disponible", count: active.filter((item) => (item.developmentStageId ?? "none") === stageId).length })).sort((left, right) => right.count - left.count);
  const columns: TableColumn<ProjectActivity>[] = [
    {
      key: "title",
      label: "Actividad",
      className: "min-w-0",
      render: (item) => <div className={`min-w-0 rounded-md px-2 py-1 ${isAttention(item) ? "bg-danger/10" : ""}`}>
        <p className={`truncate font-medium ${isAttention(item) ? "text-danger" : "text-ink"}`} title={item.title}>{item.title}</p>
        <p className="mt-0.5 text-[10px] text-muted">P{item.priority}</p>
      </div>
    },
    {
      key: "status",
      label: development ? "Etapa" : "Estado",
      render: (item) => development
        ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`size-2 rounded-full ${stageColor(stages.find((stage) => stage.id === item.developmentStageId)?.color ?? "neutral")}`} aria-hidden="true" />{progressFor(item, true, stages).label}</span>
        : <StatusBadge status={item.status} />
    },
    {
      key: "progress",
      label: "Avance",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-semibold tabular-nums text-ink">{progressFor(item, development, stages).percent}%</span>
    },
    { key: "due", label: "Fecha fin", className: "whitespace-nowrap", render: (item) => <span className={isAttention(item) ? "font-medium text-danger" : "text-muted"}>{formatDate(item.dueDate)}</span> },
    { key: "days", label: "Días", className: "whitespace-nowrap", render: (item) => <span className={isAttention(item) ? "font-semibold text-danger" : "text-muted"}>{dueLabel(today, item.dueDate)}</span> }
  ];

  return <article className="min-w-0 rounded-lg border border-line bg-canvas p-3">
    <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-ink">{title}</h4><span className="text-[11px] text-subtle">{active.length} registradas</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">{development ? "En etapas" : "Pendientes"}</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{pending}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Horas</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{hours}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Próximas / P5</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{attentionItems.length}</p></div>
      <div className="rounded-md bg-surface px-2.5 py-2"><p className="text-[10px] text-subtle">Vencidas</p><p className="mt-1 text-sm font-semibold tabular-nums text-ink">{overdue}</p></div>
    </div>
    {!development && <div className="mt-3"><div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-subtle">Avance completado</span><span className="font-semibold tabular-nums text-ink">{progress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} /></div></div>}
    {development && <div className="mt-3"><p className="text-[11px] text-subtle">Distribución por etapa</p><div className="mt-1.5 flex flex-wrap gap-1.5">{stageCounts.length ? stageCounts.slice(0, 5).map((stage) => <span key={stage.name} className="rounded-full border border-line bg-surface px-2 py-1 text-[10px] text-muted">{stage.name}: {stage.count}</span>) : <span className="text-[11px] text-subtle">Sin actividades de desarrollo.</span>}</div></div>}
    <div className="mt-3 flex items-center justify-between gap-3"><p className="text-[11px] font-medium text-subtle">Seguimiento de vencimientos</p><span className="text-[10px] text-subtle">Ventana: 10 días</span></div>
    {hasAttention ? <p className="mt-1 text-[10px] text-danger">En rojo: próximas a vencer, vencidas o con prioridad P5.</p> : <p className="mt-1 text-[10px] text-subtle">No hay próximas a vencer; se muestran las actividades pendientes restantes.</p>}
    <DataTable className="dashboard-table !mt-0 !text-xs" containerClassName="!rounded-lg" rows={tableItems} rowKey={(item) => item.id} emptyMessage="No hay actividades pendientes para mostrar." columns={columns} pagination={false} />
  </article>;
}

function ModuleKpi({ module, activities, stages }: { module: ProjectModule; activities: ProjectActivity[]; stages: Stage[] }) {
  const active = activities.filter((item) => item.type === "development" && item.moduleId === module.id && item.status !== "cancelled");
  const progressValues = active.map((item) => progressFor(item, true, stages).percent);
  const pending = active.filter((_, index) => progressValues[index] < 100).length;
  const completed = active.length - pending;
  const progress = active.length ? Math.round(progressValues.reduce((total, value) => total + value, 0) / active.length) : 0;
  return <article className="rounded-lg border border-line bg-canvas px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold text-ink" title={module.name}>{module.name}</p><span className="shrink-0 text-[10px] text-subtle">{active.length} total</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-md bg-surface px-2 py-1.5"><p className="text-[10px] text-subtle">Realizadas</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{completed}</p></div><div className="rounded-md bg-surface px-2 py-1.5"><p className="text-[10px] text-subtle">Pendientes</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{pending}</p></div></div><div className="mt-3"><div className="flex items-center justify-between text-[10px]"><span className="text-subtle">Avance por etapas</span><span className="font-semibold tabular-nums text-ink">{progress}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} /></div></div></article>;
}

export function ProjectFollowUp({ activities, scheduleItems, stages, modules, projectStatus, startDate, endDate }: { activities: ProjectActivity[]; scheduleItems: ProjectScheduleItem[]; stages: Stage[]; modules: ProjectModule[]; projectStatus: "planned" | "active" | "paused" | "completed" | "cancelled"; startDate: string | null; endDate: string | null }) {
  const today = dateKey(new Date());
  const datedSchedule = scheduleItems.filter((item) => item.kind === "activity" && (item.startDate || item.endDate)).toSorted((left, right) => (left.startDate ?? left.endDate ?? "9999").localeCompare(right.startDate ?? right.endDate ?? "9999"));
  const currentStage = datedSchedule.find((item) => (item.startDate ?? item.endDate!) <= today && (item.endDate ?? item.startDate!) >= today) ?? null;
  const nextStage = datedSchedule.find((item) => (item.startDate ?? item.endDate!) > today) ?? null;
  const stageToShow = currentStage ?? nextStage ?? datedSchedule.at(-1) ?? null;
  const stageDays = currentStage?.endDate ? daysBetween(today, currentStage.endDate) : null;
  const nextStageDays = nextStage?.startDate ? daysBetween(today, nextStage.startDate) : null;
  const ganttDates = datedSchedule.flatMap((item) => [item.startDate, item.endDate].filter((date): date is string => Boolean(date))).sort();
  const ganttStartDate = ganttDates[0] ?? null;
  const ganttEndDate = ganttDates.at(-1) ?? null;
  const timelineStartDate = startDate ?? ganttStartDate;
  const timelineEndDate = endDate ?? ganttEndDate;
  const scheduleTotal = datedSchedule.length;
  const scheduleCompleted = datedSchedule.filter((item) => item.status === "completed").length;
  const projectProgress = timelineStartDate && timelineEndDate && timelineEndDate > timelineStartDate ? Math.max(0, Math.min(100, Math.round((daysBetween(timelineStartDate, today) / daysBetween(timelineStartDate, timelineEndDate)) * 100))) : null;
  const projectDelayed = Boolean(timelineEndDate && timelineEndDate < today && projectStatus !== "completed" && projectStatus !== "cancelled");
  const projectOverdueDays = projectDelayed && timelineEndDate ? daysBetween(timelineEndDate, today) : 0;
  const stageDelayed = Boolean(stageToShow?.endDate && stageToShow.endDate < today && stageToShow.status !== "completed");
  const stageOverdueDays = stageDelayed && stageToShow?.endDate ? daysBetween(stageToShow.endDate, today) : 0;
  const stageProgress = stageToShow ? scheduleProgress(stageToShow, today) : 0;
  const temporalLabel = projectStatus === "completed" ? "Completado" : projectStatus === "cancelled" ? "Cancelado" : projectDelayed ? "Atrasado" : projectProgress === null ? "—" : `${projectProgress}%`;
  const temporalTone = projectDelayed ? "text-danger" : projectStatus === "completed" ? "text-success" : "text-ink";
  const stageTone = stageDelayed ? "bg-danger/10 text-danger" : stageToShow?.status === "completed" ? "bg-success/10 text-success" : "bg-surface text-muted";
  const generalActivities = activities.filter((item) => item.type !== "development");
  const developmentActivities = activities.filter((item) => item.type === "development");

  return <section className="mt-6 border-t border-line pt-5" aria-labelledby="project-follow-up">
    <div><h3 id="project-follow-up" className="text-sm font-semibold">Seguimiento del proyecto</h3><p className="mt-1 text-xs text-subtle">Indicadores separados para actividades, desarrollo y cronograma.</p></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2"><ActivityGroup title="Actividades" items={generalActivities} development={false} stages={stages} /><ActivityGroup title="Desarrollo" items={developmentActivities} development={true} stages={stages} /></div>
    <div className="mt-3"><div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-ink">Seguimiento de desarrollo por módulo</h4><p className="mt-1 text-xs text-subtle">Las pendientes son actividades que aún no están en la última etapa de desarrollo.</p></div></div>{modules.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map((module) => <ModuleKpi key={module.id} module={module} activities={developmentActivities} stages={stages} />)}</div> : <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-3 text-xs text-subtle">Crea módulos desde la configuración del proyecto para ver estos indicadores.</p>}</div>
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-line bg-canvas px-3 py-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-ink">Avance temporal del proyecto</p><span className={`text-xs font-semibold tabular-nums ${temporalTone}`}>{projectDelayed ? `${temporalLabel} · ${projectOverdueDays} d` : temporalLabel}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full ${projectDelayed ? "bg-danger" : "bg-success"}`} style={{ width: `${projectProgress ?? (projectStatus === "completed" ? 100 : 0)}%` }} /></div><p className="mt-2 text-[11px] text-subtle">{timelineStartDate && timelineEndDate ? `${formatDate(timelineStartDate)} – ${formatDate(timelineEndDate)}${!startDate || !endDate ? " · fechas del Gantt" : ""}` : "Registra fechas del proyecto o del Gantt para calcularlo."}</p>{projectDelayed && <p className="mt-1 text-[11px] text-danger">La fecha final pasó hace {projectOverdueDays} días y el proyecto aún no está completado.</p>}</div>
      <div className="rounded-lg border border-line bg-canvas px-3 py-3"><p className="text-xs font-medium text-ink">Etapa del cronograma</p><div className="mt-1 flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{stageToShow?.title ?? "Sin cronograma con fechas"}</p>{stageToShow && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stageTone}`}>{scheduleStatusLabels[stageToShow.status]}{stageDelayed ? ` · Atrasada ${stageOverdueDays} d` : ""}</span>}</div><p className={`mt-0.5 text-[11px] ${stageDelayed ? "text-danger" : "text-subtle"}`}>{currentStage ? stageDelayed ? `Etapa actual · venció hace ${stageOverdueDays} días` : stageDays === null ? "Etapa actual · sin fecha final" : `Etapa actual · ${stageDays === 0 ? "termina hoy" : `${stageDays} días restantes`}` : nextStage ? `Próxima etapa · ${nextStageDays === 0 ? "comienza hoy" : `comienza en ${nextStageDays} días`}` : stageToShow ? stageDelayed ? `Etapa finalizada en fecha prevista, pero aún no está completada.` : "Cronograma finalizado según las fechas registradas." : "Añade fechas para calcular la etapa actual."}</p>{stageToShow && <div className="mt-2"><div className="flex items-center justify-between gap-2 text-[10px]"><span className="text-subtle">Avance de la etapa</span><span className={`font-semibold tabular-nums ${stageDelayed ? "text-danger" : "text-ink"}`}>{stageProgress}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${stageDelayed ? "bg-danger" : "bg-accent"}`} style={{ width: `${stageProgress}%` }} /></div></div>}<p className="mt-1 text-[11px] text-muted">{stageToShow ? `${formatDate(stageToShow.startDate ?? stageToShow.endDate)} – ${formatDate(stageToShow.endDate ?? stageToShow.startDate)}${scheduleTotal ? ` · ${scheduleCompleted}/${scheduleTotal} etapas completadas` : ""}` : ""}</p></div>
    </div>
  </section>;
}
