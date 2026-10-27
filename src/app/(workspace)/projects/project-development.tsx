"use client";

import { useMemo, useState } from "react";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ActivityForm, activityCode, type ProjectActivity } from "./project-activities";
import type { ProjectModule } from "./project-modules";
import { RowActions } from "../row-actions";
import { ProjectActivityDetail } from "./project-activity-detail";
import { parseChecklist, serializeChecklist } from "@/modules/projects/checklist";

type Stage = { id: string; name: string; color: string };
type TeamMember = { id: string; name: string; role: string | null };

function stageColor(color: string) {
  return ({ blue: "bg-blue-500", violet: "bg-violet-500", amber: "bg-amber-500", green: "bg-green-500", neutral: "bg-slate-400" }[color] ?? "bg-slate-400");
}

export function ProjectDevelopment({ projectId, activities: initialActivities, stages, teamMembers, modules }: { projectId: string; activities: ProjectActivity[]; stages: Stage[]; teamMembers: TeamMember[]; modules: ProjectModule[] }) {
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

  const moduleNames = useMemo(() => new Map(modules.map((module) => [module.id, module.name])), [modules]);
  const development = activities.filter((item) => item.type === "development" && (showCancelled || item.status !== "cancelled") && (moduleFilter === "all" || item.moduleId === moduleFilter));
  const visibleStages = showCancelled ? [...stages, { id: "cancelled", name: "Canceladas", color: "neutral" }] : stages;

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

  return <div className="mt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">Desarrollo</h2><p className="mt-1 text-xs text-subtle">Actividades técnicas organizadas por etapa.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowCancelled((value) => !value)} className="ui-button ui-button-secondary !text-xs">{showCancelled ? "Ocultar canceladas" : "Mostrar canceladas"}</button>
        <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button-primary">Crear actividad</button>
        <div className="flex rounded-lg border border-line p-1">
          <button type="button" onClick={() => setView("table")} aria-pressed={view === "table"} className={`rounded-md px-3 py-1.5 text-xs ${view === "table" ? "bg-ink text-on-primary" : "text-muted"}`}>Tabla</button>
          <button type="button" onClick={() => setView("kanban")} aria-pressed={view === "kanban"} className={`rounded-md px-3 py-1.5 text-xs ${view === "kanban" ? "bg-ink text-on-primary" : "text-muted"}`}>Kanban</button>
        </div>
      </div>
    </div>

    {modules.length > 0 && <div className="mt-3 max-w-xs"><label className="block text-xs font-medium text-subtle">Filtrar por módulo<select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos los módulos</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.parentId ? "↳ " : ""}{module.name}</option>)}</select></label></div>}

    {view === "table" ? <DataTable
      className="!text-xs"
      rows={development}
      filterKey={JSON.stringify([moduleFilter, showCancelled])}
      rowKey={(item) => item.id}
      emptyMessage="No hay actividades de desarrollo."
      columns={[
        { key: "code", label: "Código", render: (item) => <span className="inline-flex rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-primary">{activityCode(item)}</span> },
        { key: "title", label: "Actividad", render: (item) => <span className="font-medium text-ink">{item.title}</span> },
        { key: "module", label: "Módulo", render: (item) => <span className="text-muted">{moduleNames.get(item.moduleId ?? "") ?? "Sin módulo"}</span> },
        { key: "stage", label: "Etapa", render: (item) => <span className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${stageColor(stages.find((stage) => stage.id === item.developmentStageId)?.color ?? "neutral")}`} />{stages.find((stage) => stage.id === item.developmentStageId)?.name ?? "Sin etapa"}</span> },
        { key: "dates", label: "Fechas", render: (item) => <>{item.activityDate ?? "—"}{item.dueDate ? ` – ${item.dueDate}` : ""}</> },
        { key: "responsibles", label: "Responsables", render: (item) => item.responsibleNames?.join(", ") || "—" },
        { key: "actions", label: "Acciones", render: (item) => <RowActions label={item.title} actions={[{ label: "Ver detalle", onSelect: () => { setDetail(item); setDetailSource("table"); } }, { label: "Editar", onSelect: () => setEditor(item) }, { label: "Eliminar", tone: "danger", onSelect: () => { setError(""); setDeleting(item); } }]} /> },
      ] satisfies TableColumn<ProjectActivity>[]}
    /> : <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
      {visibleStages.map((stage) => <section key={stage.id} className="w-64 shrink-0 rounded-lg border border-line bg-canvas p-3"><h3 className="flex items-center gap-2 text-xs font-semibold text-ink"><span className={`size-2 rounded-full ${stageColor(stage.color)}`} />{stage.name}</h3><div className="mt-3 space-y-2">
        {development.filter((item) => (stage.id === "cancelled" ? item.status === "cancelled" : item.developmentStageId === stage.id)).map((item) => <article key={item.id} role="button" tabIndex={0} onClick={() => { setDetail(item); setDetailSource("kanban"); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetail(item); setDetailSource("kanban"); } }} className="cursor-pointer rounded-md border border-line bg-surface p-2.5 text-xs transition-colors hover:border-ink/40 hover:bg-hover focus-visible:outline-2 focus-visible:outline-ink"><p className="flex flex-wrap items-center gap-1.5"><span className="inline-flex rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold text-on-primary">{activityCode(item)}</span><span className="font-medium text-ink">{item.title}</span></p><p className="mt-1 text-subtle">{moduleNames.get(item.moduleId ?? "") ?? "Sin módulo"}</p><p className="mt-1 text-subtle">{item.activityDate ?? "—"}{item.dueDate ? ` – ${item.dueDate}` : ""}</p><p className="mt-1 text-subtle">{item.responsibleNames?.join(", ") || "Sin responsables"}</p></article>)}
      </div></section>)}
    </div>}

    <ProjectActivityDetail activity={detail} stageName={detail ? stages.find((stage) => stage.id === detail.developmentStageId)?.name : undefined} moduleName={detail ? moduleNames.get(detail.moduleId ?? "") : undefined} open={detail !== null} onOpenChange={(open) => { if (!open) { setDetail(null); setDetailSource(null); } }} checklistPending={checklistPending !== null} onToggleChecklist={(index) => void toggleChecklist(index)} onEdit={detailSource === "kanban" ? () => { if (detail) { setDetail(null); setDetailSource(null); setEditor(detail); } } : undefined} onDelete={detailSource === "kanban" ? () => { if (detail) { setDetail(null); setDetailSource(null); setError(""); setDeleting(detail); } } : undefined} />
    <CreateDialog title={editor ? "Editar actividad de desarrollo" : "Crear actividad de desarrollo"} triggerLabel="Crear actividad" open={editor !== undefined} onOpenChange={(open) => { if (!open && !pending) setEditor(undefined); }} busy={pending} showTrigger={false}>
      <ActivityForm projectId={projectId} initial={editor ?? undefined} stages={stages} modules={modules} teamMembers={teamMembers} developmentOnly onSaved={saved} onPendingChange={setPending} />
    </CreateDialog>
    <CreateDialog title="Eliminar actividad" triggerLabel="Eliminar actividad" open={deleting !== null} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }} busy={pending} showTrigger={false}>
      {deleting && <div className="space-y-4"><p className="text-sm leading-6 text-muted">¿Seguro que deseas eliminar <strong className="text-ink">{deleting.title}</strong>? Esta acción no se puede deshacer.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} disabled={pending} className="ui-button ui-button-secondary">Cancelar</button><button type="button" onClick={() => void remove()} disabled={pending} className="ui-button ui-button-danger">{pending ? "Eliminando…" : "Eliminar actividad"}</button></div></div>}
    </CreateDialog>
  </div>;
}
