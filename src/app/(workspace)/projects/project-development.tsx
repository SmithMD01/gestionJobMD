"use client";

import { useMemo, useState } from "react";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ActivityForm, activityCode, type ProjectActivity } from "./project-activities";
import type { ProjectModule } from "./project-modules";
import { RowActions } from "../row-actions";
import { ProjectActivityDetail } from "./project-activity-detail";
import { parseChecklist, serializeChecklist } from "@/modules/projects/checklist";
import { Button } from "@/components/ui/button";
import { activityAttention, currentDateKey } from "@/modules/projects/activity-attention";

type Stage = { id: string; name: string; color: string; isTerminal: boolean; isCancelled: boolean };
type TeamMember = { id: string; name: string; role: string | null };

function completedMonth(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

function stageColor(color: string) {
  return ({ blue: "bg-blue-500", violet: "bg-violet-500", amber: "bg-amber-500", green: "bg-green-500", neutral: "bg-slate-400" }[color] ?? "bg-slate-400");
}

export function ProjectDevelopment({ projectId, readOnly = false, activities: initialActivities, stages, teamMembers, modules }: { projectId: string; readOnly?: boolean; activities: ProjectActivity[]; stages: Stage[]; teamMembers: TeamMember[]; modules: ProjectModule[] }) {
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [showCancelled, setShowCancelled] = useState(false);
  const [activities, setActivities] = useState(initialActivities);
  const [editor, setEditor] = useState<ProjectActivity | null | undefined>(undefined);
  const [detail, setDetail] = useState<ProjectActivity | null>(null);
  const [detailSource, setDetailSource] = useState<"table" | "kanban" | null>(null);
  const [deleting, setDeleting] = useState<ProjectActivity | null>(null);
  const [pending, setPending] = useState(false);
  const [checklistPending, setChecklistPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [finalizedMonth, setFinalizedMonth] = useState(() => `${currentDateKey().slice(0, 7)}`);
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
  const [dragTargetStageId, setDragTargetStageId] = useState<string | null>(null);
  const [movingActivityId, setMovingActivityId] = useState<string | null>(null);

  const moduleNames = useMemo(() => new Map(modules.map((module) => [module.id, module.name])), [modules]);
  const today = currentDateKey();
  const terminalStageIds = new Set(stages.filter((stage) => stage.isTerminal).map((stage) => stage.id));
  const completionMonths = Array.from(new Set(activities.filter((item) => item.type === "development" && item.developmentStageId && terminalStageIds.has(item.developmentStageId) && item.completedAt).map((item) => completedMonth(item.completedAt)).filter(Boolean))).sort().reverse();
  const currentMonth = today.slice(0, 7);
  const development = activities.filter((item) => {
    if (item.type !== "development" || (!showCancelled && item.status === "cancelled") || (moduleFilter !== "all" && item.moduleId !== moduleFilter)) return false;
    if (!item.developmentStageId || !terminalStageIds.has(item.developmentStageId)) return true;
    const month = completedMonth(item.completedAt);
    return finalizedMonth === "all" || month === finalizedMonth;
  });
  const visibleStages = stages.filter((stage) => showCancelled || !stage.isCancelled);

  function saved(item: ProjectActivity) {
    const responsibleNames = item.responsibleIds?.map((id) => teamMembers.find((member) => member.id === id)?.name).filter((name): name is string => Boolean(name));
    const nextItem = { ...item, responsibleNames: responsibleNames?.length ? responsibleNames : editor?.responsibleNames };
    setActivities((current) => editor ? current.map((row) => row.id === item.id ? nextItem : row) : [...current, nextItem]);
    setEditor(undefined);
  }

  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/activities/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setActivities((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setError("No se pudo eliminar la actividad.");
    } finally {
      setPending(false);
    }
  }

  async function toggleChecklist(index: number) {
    if (!detail || checklistPending) return;
    const checklist = parseChecklist(detail.checklist);
    const target = checklist[index];
    if (!target) return;
    const nextChecklist = checklist.map((entry, itemIndex) => itemIndex === index ? { ...entry, done: !entry.done } : entry);
    setChecklistPending(`${detail.id}:${index}`);
    try {
      const response = await fetch(`/api/projects/${projectId}/activities/${detail.id}/checklist`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ checklist: serializeChecklist(nextChecklist) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.activity) throw new Error();
      const updated = { ...detail, checklist: result.activity.checklist };
      setActivities((current) => current.map((row) => row.id === detail.id ? updated : row));
      setDetail(updated);
    } catch {
      setError("No se pudo actualizar el checklist.");
    } finally {
      setChecklistPending(null);
    }
  }

  async function moveToStage(item: ProjectActivity, stage: Stage) {
    if (readOnly || pending || movingActivityId || item.developmentStageId === stage.id) return;
    setMovingActivityId(item.id);
    const previous = activities;
    const completedAt = stage.isTerminal ? new Date().toISOString() : null;
    const status = stage.isCancelled ? "cancelled" : stage.isTerminal ? "completed" : item.status === "cancelled" || item.status === "completed" ? "pending" : item.status;
    setActivities((current) => current.map((row) => row.id === item.id ? { ...row, developmentStageId: stage.id, completedAt, status } : row));
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/activities/${item.id}/stage`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ developmentStageId: stage.id }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.activity) throw new Error(result?.error ?? "No se pudo cambiar la etapa.");
      setActivities((current) => current.map((row) => row.id === item.id ? { ...row, ...result.activity } : row));
    } catch (caught) {
      setActivities(previous);
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la etapa.");
    } finally { setMovingActivityId(null); }
  }

  return <div className="mt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">Desarrollo</h2><p className="mt-1 text-xs text-subtle">Actividades técnicas organizadas por etapa.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="compact" onClick={() => setShowCancelled((value) => !value)}>{showCancelled ? "Ocultar canceladas" : "Mostrar canceladas"}</Button>
        {!readOnly && <Button type="button" variant="primary" onClick={() => setEditor(null)}>Crear actividad</Button>}
        <div className="flex rounded-lg border border-line p-1">
          <Button type="button" variant={view === "table" ? "primary" : "ghost"} size="compact" onClick={() => setView("table")} aria-pressed={view === "table"}>Tabla</Button>
          <Button type="button" variant={view === "kanban" ? "primary" : "ghost"} size="compact" onClick={() => setView("kanban")} aria-pressed={view === "kanban"}>Kanban</Button>
        </div>
      </div>
    </div>

    {modules.length > 0 && <div className="mt-3 max-w-xs"><label className="block text-xs font-medium text-subtle">Filtrar por módulo<select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos los módulos</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.parentId ? "↳ " : ""}{module.name}</option>)}</select></label></div>}

    {stages.some((stage) => stage.isTerminal) && <div className="mt-3 flex flex-wrap items-center justify-between gap-3">{view === "kanban" && !readOnly ? <p className="text-[11px] text-subtle">Arrastra una tarjeta a otra columna para cambiar su etapa.</p> : <span />}{<label className="text-xs font-medium text-muted">Finalizadas<select value={finalizedMonth} onChange={(event) => setFinalizedMonth(event.target.value)} className="ui-field ml-2 inline-flex w-auto min-w-44"><option value={currentMonth}>Del mes actual</option>{completionMonths.filter((month) => month !== currentMonth).map((month) => <option key={month} value={month}>{new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</option>)}<option value="all">Todos los meses</option></select></label>}</div>}

    {view === "table" ? <DataTable
      className="!text-xs"
      rows={development}
      filterKey={JSON.stringify([moduleFilter, showCancelled])}
      sortRows={(items) => [...items].sort((a, b) => { const rank = (item: ProjectActivity) => { const attention = activityAttention(item, today); return attention === "overdue" ? 0 : attention === "upcoming" ? 1 : attention === "urgent" ? 2 : 3; }; return rank(a) - rank(b) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.priority - a.priority; })}
      rowKey={(item) => item.id}
      emptyMessage="No hay actividades de desarrollo."
      columns={[
        { key: "code", label: "Código", render: (item) => <span className="inline-flex rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-primary">{activityCode(item)}</span> },
        { key: "title", label: "Actividad", render: (item) => { const attention = activityAttention(item, today); return <span className={`font-medium ${attention === "overdue" ? "text-danger" : attention === "upcoming" ? "text-warning" : "text-ink"}`}>{item.title}</span>; } },
        { key: "module", label: "Módulo", render: (item) => <span className="text-muted">{moduleNames.get(item.moduleId ?? "") ?? "Sin módulo"}</span> },
        { key: "stage", label: "Etapa", render: (item) => <span className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${stageColor(stages.find((stage) => stage.id === item.developmentStageId)?.color ?? "neutral")}`} />{stages.find((stage) => stage.id === item.developmentStageId)?.name ?? "Sin etapa"}</span> },
        { key: "priority", label: "Prioridad", render: (item) => <span className="font-medium text-ink">P{item.priority}</span> },
        { key: "dates", label: "Fechas", render: (item) => { const attention = activityAttention(item, today); const className = attention === "overdue" ? "text-danger" : attention === "upcoming" ? "text-warning" : "text-muted"; return <span className={className}>{item.activityDate ?? "—"}{item.dueDate ? ` – ${item.dueDate}` : ""}</span>; } },
        { key: "responsibles", label: "Responsables", render: (item) => item.responsibleNames?.join(", ") || "—" },
        { key: "actions", label: "Acciones", render: (item) => <RowActions label={item.title} actions={[{ label: "Ver detalle", onSelect: () => { setDetail(item); setDetailSource("table"); } }, ...(!readOnly ? [{ label: "Editar", onSelect: () => setEditor(item) }, { label: "Eliminar", tone: "danger" as const, onSelect: () => { setError(""); setDeleting(item); } }] : [])]} /> },
      ] satisfies TableColumn<ProjectActivity>[]}
    /> : <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
      {visibleStages.map((stage) => <section key={stage.id} onDragOver={(event) => { if (!readOnly && !movingActivityId) { event.preventDefault(); setDragTargetStageId(stage.id); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragTargetStageId(null); }} onDrop={(event) => { event.preventDefault(); const item = development.find((entry) => entry.id === (event.dataTransfer.getData("text/plain") || draggedActivityId)); if (item) void moveToStage(item, stage); setDragTargetStageId(null); setDraggedActivityId(null); }} className={`w-64 shrink-0 rounded-lg border bg-canvas p-3 transition-colors ${dragTargetStageId === stage.id ? "border-accent bg-accent/5" : "border-line"}`}><h3 className="flex items-center gap-2 text-xs font-semibold text-ink"><span className={`size-2 rounded-full ${stageColor(stage.color)}`} />{stage.name}</h3><div className="mt-3 min-h-12 space-y-2">
        {development.filter((item) => stage.isCancelled ? item.status === "cancelled" || item.developmentStageId === stage.id : item.developmentStageId === stage.id).map((item) => { const attention = activityAttention(item, today); const attentionClasses = attention === "overdue" ? "border-danger/40 bg-danger/5" : attention === "upcoming" ? "border-warning/40 bg-warning/5" : "border-line bg-surface"; const attentionText = attention === "overdue" ? "text-danger" : attention === "upcoming" ? "text-warning" : "text-ink"; return <article key={item.id} role="button" tabIndex={0} draggable={!readOnly && !movingActivityId} onDragStart={(event) => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "move"; setDraggedActivityId(item.id); }} onDragEnd={() => { setDraggedActivityId(null); setDragTargetStageId(null); }} onClick={() => { setDetail(item); setDetailSource("kanban"); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetail(item); setDetailSource("kanban"); } }} className={`cursor-pointer rounded-md border p-2.5 text-xs transition-colors hover:border-ink/40 hover:bg-hover focus-visible:outline-2 focus-visible:outline-ink ${attentionClasses} ${draggedActivityId === item.id ? "opacity-45" : ""}`}><p className="flex flex-wrap items-center gap-1.5"><span className="inline-flex rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold text-on-primary">{activityCode(item)}</span><span className={`font-medium ${attentionText}`}>{item.title}</span></p><p className="mt-1 text-subtle">{moduleNames.get(item.moduleId ?? "") ?? "Sin módulo"}</p><p className={`mt-1 ${attention ? attentionText : "text-subtle"}`}>{item.activityDate ?? "—"}{item.dueDate ? ` – ${item.dueDate}` : ""}</p><p className="mt-1 text-subtle">{item.responsibleNames?.join(", ") || "Sin responsables"}</p></article>; })}
      </div></section>)}
    </div>}

    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}

    <ProjectActivityDetail activity={detail} stageName={detail ? stages.find((stage) => stage.id === detail.developmentStageId)?.name : undefined} moduleName={detail ? moduleNames.get(detail.moduleId ?? "") : undefined} open={detail !== null} onOpenChange={(open) => { if (!open) { setDetail(null); setDetailSource(null); } }} checklistPending={checklistPending !== null} onToggleChecklist={readOnly ? undefined : (index) => void toggleChecklist(index)} onEdit={!readOnly && detailSource === "kanban" ? () => { if (detail) { setDetail(null); setDetailSource(null); setEditor(detail); } } : undefined} onDelete={!readOnly && detailSource === "kanban" ? () => { if (detail) { setDetail(null); setDetailSource(null); setError(""); setDeleting(detail); } } : undefined} />
    {!readOnly && <CreateDialog title={editor ? "Editar actividad de desarrollo" : "Crear actividad de desarrollo"} triggerLabel="Crear actividad" open={editor !== undefined} onOpenChange={(open) => { if (!open && !pending) setEditor(undefined); }} busy={pending} showTrigger={false}>
      <ActivityForm projectId={projectId} initial={editor ?? undefined} stages={stages} modules={modules} teamMembers={teamMembers} developmentOnly onSaved={saved} onPendingChange={setPending} />
    </CreateDialog>}
    {!readOnly && <CreateDialog title="Eliminar actividad" triggerLabel="Eliminar actividad" open={deleting !== null} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }} busy={pending} showTrigger={false}>
      {deleting && <div className="space-y-4"><p className="text-sm leading-6 text-muted">¿Seguro que deseas eliminar <strong className="text-ink">{deleting.title}</strong>? Esta acción no se puede deshacer.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(null)} disabled={pending}>Cancelar</Button><Button type="button" variant="danger" loading={pending} onClick={() => void remove()}>{pending ? "Eliminando…" : "Eliminar actividad"}</Button></div></div>}
    </CreateDialog>}
  </div>;
}
