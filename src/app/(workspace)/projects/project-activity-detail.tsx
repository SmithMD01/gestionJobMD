"use client";

import { useState, type FormEvent } from "react";
import { ViewDetailsDialog } from "../view-details-dialog";
import { activityCode, StatusBadge, typeLabels, type ProjectActivity } from "./project-activities";
import { parseChecklist } from "@/modules/projects/checklist";
import { Button } from "@/components/ui/button";
import { activityActualMinutes, formatActivityDuration, formatActivityEstimate, type ActivityTimeEntry } from "@/modules/projects/activity-time";

function ActivityTimeLog({ projectId, activity, onAdded }: { projectId: string; activity: ProjectActivity; onAdded?: (entry: ActivityTimeEntry) => void }) {
  const [hours, setHours] = useState("0.5");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const entries = activity.timeEntries ?? [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const minutes = Math.round(Number(hours) * 60);
    if (!Number.isFinite(minutes) || minutes < 30 || minutes % 30 !== 0) {
      setError("Ingresa tiempo en bloques de 30 minutos.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/activities/${activity.id}/time-entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.entry) throw new Error(result?.error || "No se pudo registrar el tiempo.");
      onAdded?.(result.entry as ActivityTimeEntry);
      setHours("0.5");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo registrar el tiempo.");
    } finally {
      setPending(false);
    }
  }

  return <section className="border-t border-line pt-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-xs font-semibold uppercase tracking-wide text-subtle">Tiempo trabajado</h4><p className="text-xs font-medium text-ink">Total: {formatActivityDuration(activityActualMinutes(entries))}</p></div>
    {onAdded && <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="block text-xs font-medium text-muted">Añadir tiempo (horas)<input aria-label="Tiempo trabajado en horas" type="number" min="0.5" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} className="ui-field mt-1 w-32" /></label>
      <Button type="submit" variant="secondary" size="compact" loading={pending}>{pending ? "Registrando…" : "Registrar tiempo"}</Button>
    </form>}
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    {entries.length ? <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-canvas px-3">
      {entries.map((entry) => { const createdAt = entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt); return <li key={entry.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-xs"><span className="font-medium text-ink">{formatActivityDuration(entry.minutes)}</span><span className="text-muted">{createdAt.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" })} · {entry.loggedByName}</span></li>; })}
    </ul> : <p className="mt-2 text-xs text-muted">Aún no hay tiempo real registrado.</p>}
  </section>;
}

export function ProjectActivityDetail({ projectId, activity, stageName, moduleName, open, onOpenChange, checklistPending = false, onToggleChecklist, onTimeEntryAdded, onEdit, onDelete }: { projectId: string; activity: ProjectActivity | null; stageName?: string; moduleName?: string; open: boolean; onOpenChange: (open: boolean) => void; checklistPending?: boolean; onToggleChecklist?: (index: number) => void; onTimeEntryAdded?: (entry: ActivityTimeEntry) => void; onEdit?: () => void; onDelete?: () => void }) {
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
        <div><p className="text-xs uppercase tracking-wide text-subtle">Horas estimadas / reales</p><p className="mt-1 text-ink">{formatActivityEstimate(activity.hours)} / {formatActivityDuration(activityActualMinutes(activity.timeEntries))}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Fecha de completado</p><p className="mt-1 text-ink">{activity.completedAt ? (activity.completedAt instanceof Date ? activity.completedAt : new Date(activity.completedAt)).toLocaleDateString("es-PE", { timeZone: "America/Lima" }) : "Sin completar"}</p></div>
      </div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Responsables</p><p className="mt-1 text-ink">{activity.responsibleNames?.join(", ") || "Sin responsables"}</p></div>
      <ActivityTimeLog key={activity.id} projectId={projectId} activity={activity} onAdded={onTimeEntryAdded} />
      <div><p className="text-xs uppercase tracking-wide text-subtle">Descripción</p><p className="mt-1 whitespace-pre-wrap leading-6 text-ink">{activity.observations || "Sin descripción"}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Checklist</p>{checklist.length === 0 ? <p className="mt-1 text-muted">Sin elementos.</p> : <ul className="mt-2 space-y-2">{checklist.map((item, index) => <li key={`${item.text}-${index}`}><label className="flex items-start gap-2"><input type="checkbox" checked={item.done} disabled={!onToggleChecklist || checklistPending} onChange={() => onToggleChecklist?.(index)} className="mt-0.5" /><span className={item.done ? "text-muted line-through" : "text-ink"}>{item.text}</span></label></li>)}</ul>}</div>
      {(onEdit || onDelete) && <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="secondary" onClick={onEdit}>Editar</Button><Button type="button" variant="danger" onClick={onDelete}>Eliminar</Button></div>}
    </div>
  </ViewDetailsDialog>;
}
