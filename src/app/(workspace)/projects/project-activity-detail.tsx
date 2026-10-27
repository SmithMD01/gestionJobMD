"use client";

import { ViewDetailsDialog } from "../view-details-dialog";
import { activityCode, StatusBadge, typeLabels, type ProjectActivity } from "./project-activities";
import { parseChecklist } from "@/modules/projects/checklist";
import { Button } from "@/components/ui/button";

export function ProjectActivityDetail({ activity, stageName, moduleName, open, onOpenChange, checklistPending = false, onToggleChecklist, onEdit, onDelete }: { activity: ProjectActivity | null; stageName?: string; moduleName?: string; open: boolean; onOpenChange: (open: boolean) => void; checklistPending?: boolean; onToggleChecklist?: (index: number) => void; onEdit?: () => void; onDelete?: () => void }) {
  if (!activity) return null;
  const checklist = parseChecklist(activity.checklist);
  return <ViewDetailsDialog title="Detalle de actividad" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-5 text-sm">
      <div><p className="font-mono text-xs text-muted">{activityCode(activity)}</p><h3 className="mt-1 text-lg font-semibold text-ink">{activity.title}</h3></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase tracking-wide text-subtle">Tipo</p><p className="mt-1 text-ink">{typeLabels[activity.type]}</p></div>
        {activity.type !== "development" && <div><p className="text-xs uppercase tracking-wide text-subtle">Estado</p><p className="mt-1 text-ink"><StatusBadge status={activity.status} /></p></div>}
        <div><p className="text-xs uppercase tracking-wide text-subtle">Prioridad</p><p className="mt-1 text-ink">P{activity.priority}</p></div>
        {moduleName && <div><p className="text-xs uppercase tracking-wide text-subtle">Módulo</p><p className="mt-1 text-ink">{moduleName}</p></div>}
        {stageName && <div><p className="text-xs uppercase tracking-wide text-subtle">Etapa de desarrollo</p><p className="mt-1 text-ink">{stageName}</p></div>}
        <div><p className="text-xs uppercase tracking-wide text-subtle">Fecha de actividad</p><p className="mt-1 text-ink">{activity.activityDate || "Sin fecha"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Fecha límite</p><p className="mt-1 text-ink">{activity.dueDate || "Sin fecha"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Horas</p><p className="mt-1 text-ink">{activity.hours ?? "—"}</p></div>
      </div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Responsables</p><p className="mt-1 text-ink">{activity.responsibleNames?.join(", ") || "Sin responsables"}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Descripción</p><p className="mt-1 whitespace-pre-wrap leading-6 text-ink">{activity.observations || "Sin descripción"}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Checklist</p>{checklist.length === 0 ? <p className="mt-1 text-muted">Sin elementos.</p> : <ul className="mt-2 space-y-2">{checklist.map((item, index) => <li key={`${item.text}-${index}`}><label className="flex items-start gap-2"><input type="checkbox" checked={item.done} disabled={!onToggleChecklist || checklistPending} onChange={() => onToggleChecklist?.(index)} className="mt-0.5" /><span className={item.done ? "text-muted line-through" : "text-ink"}>{item.text}</span></label></li>)}</ul>}</div>
      {(onEdit || onDelete) && <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="secondary" onClick={onEdit}>Editar</Button><Button type="button" variant="danger" onClick={onDelete}>Eliminar</Button></div>}
    </div>
  </ViewDetailsDialog>;
}
