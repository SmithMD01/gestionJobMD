"use client";

import { useState, type FormEvent } from "react";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { RowActions } from "../row-actions";
import { ScheduleExcelImport } from "./schedule-excel-import";
import { Button } from "@/components/ui/button";
import { ACTIVITY_UPCOMING_DAYS } from "@/modules/projects/activity-attention";

export type ProjectSchedule = { id: string; status: "draft" | "confirmed"; confirmedAt: string | null };
export type ProjectScheduleItemStatus = "planned" | "in_progress" | "completed";
export type ProjectScheduleItemKind = "phase" | "activity";
export type ProjectScheduleItem = { id: string; title: string; description: string; kind: ProjectScheduleItemKind; color: "slate" | "blue" | "violet" | "amber" | "green" | "rose"; status: ProjectScheduleItemStatus; startDate: string | null; endDate: string | null; sortOrder: number };
type ImportedScheduleItem = Omit<ProjectScheduleItem, "id" | "sortOrder">;

const scheduleColors = {
  slate: { label: "Gris", bar: "bg-slate-500", dot: "bg-slate-500" },
  blue: { label: "Azul", bar: "bg-blue-500", dot: "bg-blue-500" },
  violet: { label: "Violeta", bar: "bg-violet-500", dot: "bg-violet-500" },
  amber: { label: "Ámbar", bar: "bg-amber-500", dot: "bg-amber-500" },
  green: { label: "Verde", bar: "bg-green-500", dot: "bg-green-500" },
  rose: { label: "Rojo", bar: "bg-rose-500", dot: "bg-rose-500" },
} as const;
const scheduleStatusLabels: Record<ProjectScheduleItemStatus, string> = { planned: "Pendiente", in_progress: "En desarrollo", completed: "Completada" };
const scheduleStatusDots: Record<ProjectScheduleItemStatus, string> = { planned: "bg-subtle", in_progress: "bg-info", completed: "bg-success" };
const scheduleKindLabels: Record<ProjectScheduleItemKind, string> = { phase: "Fase", activity: "Actividad" };

function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-PE") : "—"; }
function draftId() { return `draft-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`; }

const DAY_MS = 24 * 60 * 60 * 1000;

function dateAtMidnight(value: string) { return new Date(`${value}T00:00:00`); }
function dayKey(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dayDifference(start: Date, end: Date) { return Math.round((end.getTime() - start.getTime()) / DAY_MS); }
function localDayKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function csvCell(value: string | number | null) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function exportSchedule(items: ProjectScheduleItem[], projectId: string) {
  const rows = [
    ["Orden", "Tipo", "Etapa o actividad", "Estado", "Inicio", "Fin", "Color", "Descripción"],
    ...items.map((item, index) => [String(index + 1), scheduleKindLabels[item.kind], item.title, scheduleStatusLabels[item.status], item.startDate ?? "", item.endDate ?? "", scheduleColors[item.color]?.label ?? "", item.description]),
  ];
  const csv = `\ufeff${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `cronograma-${projectId.slice(0, 8)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ScheduleGantt({ items }: { items: ProjectScheduleItem[] }) {
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const dayWidth = density === "compact" ? 26 : 34;
  const datedItems = items.filter((item) => item.startDate || item.endDate);
  if (!datedItems.length) return <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas px-4 py-5 text-sm text-muted">Añade fechas a las filas para visualizar el cronograma en Gantt.</div>;

  const dates = datedItems.flatMap((item) => [item.startDate, item.endDate].filter((date): date is string => Boolean(date)).map(dateAtMidnight));
  const firstDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const lastDate = new Date(Math.max(...dates.map((date) => date.getTime())));
  const timelineDays = dayDifference(firstDate, lastDate) + 1;
  const timelineWidth = timelineDays * dayWidth;
  const timeline = Array.from({ length: timelineDays }, (_, index) => addDays(firstDate, index));
  const months = timeline.reduce<Array<{ key: string; label: string; days: number }>>((groups, date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const current = groups.at(-1);
    if (current?.key === key) current.days += 1;
    else groups.push({ key, label: date.toLocaleDateString("es-PE", { month: "long", year: "numeric" }), days: 1 });
    return groups;
  }, []);
  const ganttItems = items.filter((item) => item.kind === "phase" || item.startDate || item.endDate);
  const rowsWithoutDates = items.filter((item) => item.kind === "activity" && !item.startDate && !item.endDate);
  const today = localDayKey(new Date());

  return <div className="mt-4 space-y-4">
    <div className="overflow-x-auto rounded-xl border border-line bg-surface pb-2">
      <div style={{ minWidth: `${timelineWidth + 190}px` }}>
        <div className="grid border-b border-line bg-canvas" style={{ gridTemplateColumns: `minmax(11rem, 14rem) ${timelineWidth}px` }}>
          <div className="sticky left-0 z-30 border-r border-line bg-canvas px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">Etapa o actividad</div>
          <div>
            <div className="flex h-7 border-b border-line">{months.map((month) => <div key={month.key} style={{ width: `${month.days * dayWidth}px` }} className="shrink-0 border-r border-line px-2 py-1 text-[10px] font-semibold capitalize text-subtle">{month.label}</div>)}</div>
            <div className="flex h-9">{timeline.map((date) => <div key={dayKey(date)} style={{ width: `${dayWidth}px` }} className="shrink-0 border-r border-line px-1 py-1 text-center text-[10px] leading-4 text-muted"><span className="block font-semibold text-ink">{date.getDate()}</span><span>{date.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "")}</span></div>)}</div>
          </div>
        </div>
        {ganttItems.map((item) => {
          const isPhase = item.kind === "phase";
          const start = dateAtMidnight(item.startDate ?? item.endDate ?? dayKey(firstDate));
          const end = dateAtMidnight(item.endDate ?? item.startDate ?? dayKey(firstDate));
          const offset = dayDifference(firstDate, start);
          const duration = dayDifference(start, end) + 1;
          const barWidth = Math.max(duration * dayWidth - 4, 12);
          const overdueDays = !isPhase && item.status !== "completed" && item.endDate && item.endDate < today ? dayDifference(end, dateAtMidnight(today)) : 0;
          const remainingDays = !isPhase && item.status !== "completed" && item.endDate && item.endDate > today ? dayDifference(dateAtMidnight(today), end) : 0;
          const upcoming = !isPhase && remainingDays > 0 && remainingDays <= ACTIVITY_UPCOMING_DAYS;
          const timingText = overdueDays > 0 ? `${overdueDays} d atraso` : remainingDays > 0 ? `${remainingDays} d restantes` : item.endDate === today ? "Termina hoy" : "";
          const showBarLabel = !isPhase && barWidth >= 118 && Boolean(timingText);
          const statusDot = overdueDays > 0 ? "bg-danger" : upcoming ? "bg-warning" : scheduleStatusDots[item.status];
          return <div key={item.id} className={`grid min-h-12 border-b border-line last:border-b-0 ${isPhase ? "bg-canvas" : ""}`} style={{ gridTemplateColumns: `minmax(11rem, 14rem) ${timelineWidth}px` }}>
            <div className={`sticky left-0 z-20 flex min-w-0 items-center border-r border-line px-3 py-2 ${isPhase ? "bg-canvas" : "bg-surface"}`}><span className={`mr-2 size-2 shrink-0 rounded-full ${statusDot}`} aria-hidden="true" /><div className="min-w-0"><span className={`block truncate text-xs text-ink ${isPhase ? "font-semibold uppercase tracking-wide" : "font-medium"}`} title={item.title}>{item.title}</span>{isPhase && <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-subtle">Fase</span>}</div></div>
            <div className={`relative flex items-center ${isPhase ? "bg-canvas" : ""}`} style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${dayWidth - 1}px, var(--color-line) ${dayWidth - 1}px, var(--color-line) ${dayWidth}px)` }}>
              {!isPhase && <span title={`${item.title}: ${scheduleStatusLabels[item.status]} · ${formatDate(item.startDate ?? item.endDate)} – ${formatDate(item.endDate ?? item.startDate)}${timingText ? ` · ${timingText}` : ""}${item.description ? ` · ${item.description}` : ""}`} aria-label={`${item.title}${timingText ? `, ${timingText}` : ""}`} className={`absolute z-10 flex h-6 min-w-3 items-center overflow-hidden whitespace-nowrap rounded-md px-2 text-[10px] font-medium leading-6 text-on-primary shadow-sm ${scheduleColors[item.color]?.bar ?? scheduleColors.blue.bar} ${overdueDays > 0 ? "ring-2 ring-danger/70" : upcoming ? "ring-2 ring-warning/70" : ""} ${item.status === "completed" ? "opacity-60" : ""}`} style={{ left: `${offset * dayWidth + 2}px`, width: `${barWidth}px` }}>{showBarLabel ? timingText : ""}</span>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {rowsWithoutDates.length > 0 && <div className="rounded-lg border border-dashed border-line bg-canvas px-3 py-2 text-xs text-muted"><span className="font-semibold text-ink">Sin fechas:</span> {rowsWithoutDates.map((item) => item.title).join(", ")}</div>}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-canvas px-3 py-2 text-[11px] text-muted"><span className="font-semibold text-ink">Estado de la etapa:</span>{Object.entries(scheduleStatusLabels).map(([status, label]) => <span key={status} className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${scheduleStatusDots[status as ProjectScheduleItemStatus]}`} aria-hidden="true" />{label}</span>)}<span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" aria-hidden="true" />Atrasada</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" aria-hidden="true" />Próxima a vencer</span></div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>Escala: {density === "compact" ? "más información visible" : "más espacio por día"}</span><Button type="button" variant="secondary" size="compact" onClick={() => setDensity((value) => value === "compact" ? "comfortable" : "compact")}>Cambiar escala</Button></div>
  </div>;
}

function ScheduleRowForm({ initial, onSaved, onPendingChange }: { initial?: ProjectScheduleItem; onSaved: (item: ProjectScheduleItem) => void; onPendingChange: (value: boolean) => void }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get("startDate") || "") || null;
    const endDate = String(form.get("endDate") || "") || null;
    if (startDate && endDate && endDate < startDate) { setError("La fecha final debe ser igual o posterior a la fecha inicial."); return; }
    onPendingChange(true);
    onSaved({ id: initial?.id ?? draftId(), title: String(form.get("title") ?? "").trim(), description: String(form.get("description") ?? "").trim(), kind: (String(form.get("kind") || "activity") as ProjectScheduleItemKind), color: (String(form.get("color") || "blue") as ProjectScheduleItem["color"]), status: (String(form.get("status") || "planned") as ProjectScheduleItemStatus), startDate, endDate, sortOrder: initial?.sortOrder ?? 0 });
    onPendingChange(false);
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-medium sm:col-span-2">Nombre de la fila<input name="title" required maxLength={180} defaultValue={initial?.title ?? ""} className="ui-field mt-1 block" placeholder="Ej. Desarrollo de módulo" /></label>
    <label className="block text-sm font-medium">Tipo de fila<select name="kind" defaultValue={initial?.kind ?? "activity"} className="ui-field mt-1 block">{Object.entries(scheduleKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium">Color<select name="color" defaultValue={initial?.color ?? "blue"} className="ui-field mt-1 block">{Object.entries(scheduleColors).map(([value, color]) => <option key={value} value={value}>{color.label}</option>)}</select></label>
    <label className="block text-sm font-medium">Estado<select name="status" defaultValue={initial?.status ?? "planned"} className="ui-field mt-1 block">{Object.entries(scheduleStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium">Fecha de inicio<input name="startDate" type="date" defaultValue={initial?.startDate ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium">Fecha final<input name="endDate" type="date" defaultValue={initial?.endDate ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium sm:col-span-2">Descripción<textarea name="description" maxLength={2000} rows={3} defaultValue={initial?.description ?? ""} className="ui-field mt-1 block" placeholder="Notas opcionales de esta etapa" /></label>
    {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
    <Button variant="primary" className="sm:col-span-2">{initial ? "Guardar fila" : "Añadir fila"}</Button>
  </form>;
}

export function ProjectSchedule({ projectId, readOnly = false, initialSchedule, initialItems }: { projectId: string; readOnly?: boolean; initialSchedule: ProjectSchedule | null; initialItems: ProjectScheduleItem[] }) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [items, setItems] = useState(initialItems);
  const [draftItems, setDraftItems] = useState(initialItems);
  const [editing, setEditing] = useState(false);
  const [rowEditor, setRowEditor] = useState<ProjectScheduleItem | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"table" | "gantt">("gantt");
  const [importOpen, setImportOpen] = useState(false);
  const [importPending, setImportPending] = useState(false);

  function beginEditing() { setDraftItems(items.map((item, index) => ({ ...item, sortOrder: index }))); setError(""); setEditing(true); }
  function cancelEditing() { setDraftItems(items); setError(""); setEditing(false); }
  function saveRow(item: ProjectScheduleItem) {
    setDraftItems((current) => rowEditor ? current.map((row) => row.id === item.id ? { ...item, sortOrder: row.sortOrder } : row) : [...current, { ...item, sortOrder: current.length }]);
    setRowEditor(undefined);
  }
  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draftItems.length) return;
    setDraftItems((current) => current.map((item, itemIndex) => itemIndex === index ? current[target] : itemIndex === target ? current[index] : item).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  }
  function removeRow(id: string) { setDraftItems((current) => current.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index }))); }
  function loadImportedItems(imported: ImportedScheduleItem[]) {
    setDraftItems(imported.map((item, index) => ({ ...item, id: draftId(), sortOrder: index })));
    setError("");
    setEditing(true);
    setImportOpen(false);
  }

  async function saveSchedule() {
    if (!draftItems.length) { setError("Añade al menos una fila antes de guardar el cronograma."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/schedule`, { method: schedule ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: draftItems.map(({ title, description, kind, color, status, startDate, endDate }) => ({ title, description, kind, color, status, startDate, endDate })) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.schedule) throw new Error(result?.error || "No se pudo guardar el cronograma.");
      setSchedule({ id: result.schedule.id, status: result.schedule.status, confirmedAt: result.schedule.confirmedAt });
      setItems(result.items ?? []); setDraftItems(result.items ?? []); setEditing(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el cronograma."); }
    finally { setPending(false); }
  }

  const readOnlyColumns: TableColumn<ProjectScheduleItem>[] = [
    { key: "order", label: "#", className: "w-12", render: (_item, index) => index + 1 } as TableColumn<ProjectScheduleItem>,
    { key: "kind", label: "Tipo", className: "whitespace-nowrap", render: (item) => scheduleKindLabels[item.kind] },
    { key: "title", label: "Etapa o actividad", render: (item) => <span className="flex items-center gap-2 font-medium text-ink"><span className={`size-2 shrink-0 rounded-full ${scheduleColors[item.color]?.dot ?? scheduleColors.blue.dot}`} aria-hidden="true" />{item.title}</span> },
    { key: "status", label: "Estado", render: (item) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`size-2 rounded-full ${scheduleStatusDots[item.status]}`} aria-hidden="true" />{scheduleStatusLabels[item.status]}</span> },
    { key: "start", label: "Inicio", render: (item) => formatDate(item.startDate) },
    { key: "end", label: "Fin", render: (item) => formatDate(item.endDate) },
    { key: "description", label: "Descripción", render: (item) => <span className="block max-w-sm truncate text-muted" title={item.description || "—"}>{item.description || "—"}</span> },
  ];
  const editableColumns: TableColumn<ProjectScheduleItem>[] = [
    ...readOnlyColumns,
    { key: "actions", label: "Acciones", render: (item) => { const index = draftItems.findIndex((row) => row.id === item.id); return <div className="flex items-center justify-end gap-1"><button type="button" onClick={() => moveRow(index, -1)} disabled={index <= 0} aria-label={`Mover ${item.title} arriba`} className="ui-icon-button disabled:opacity-40">↑</button><button type="button" onClick={() => moveRow(index, 1)} disabled={index >= draftItems.length - 1} aria-label={`Mover ${item.title} abajo`} className="ui-icon-button disabled:opacity-40">↓</button><RowActions label={item.title} actions={[{ label: "Editar", onSelect: () => setRowEditor(item) }, { label: "Eliminar", tone: "danger", onSelect: () => removeRow(item.id) }]} /></div>; } },
  ];

  return <div className="mt-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Cronograma</h2><p className="mt-1 text-xs text-subtle">{readOnly ? "Consulta las etapas y fechas del proyecto." : "Edita las filas en la tabla y guarda los cambios. La vista Gantt se actualiza con el mismo cronograma."}</p></div><div className="flex flex-wrap items-center justify-end gap-2">{!readOnly && !editing && <CreateDialog title="Importar cronograma desde Excel" triggerLabel="Importar Excel" open={importOpen} onOpenChange={setImportOpen} busy={importPending}><ScheduleExcelImport projectId={projectId} onImported={loadImportedItems} onPendingChange={setImportPending} /></CreateDialog>}{schedule && !editing && <Button type="button" variant="success" onClick={() => exportSchedule(items, projectId)}>Exportar para Excel</Button>}{!readOnly && schedule && !editing && <Button type="button" variant="secondary" onClick={beginEditing}>Editar cronograma</Button>}{!readOnly && !schedule && !editing && <Button type="button" variant="primary" onClick={() => setEditing(true)}>Crear cronograma</Button>}{!editing && schedule && <div className="flex rounded-lg border border-line p-1" role="group" aria-label="Vista del cronograma"><Button type="button" variant={view === "table" ? "primary" : "ghost"} size="compact" onClick={() => setView("table")} aria-pressed={view === "table"}>Tabla</Button><Button type="button" variant={view === "gantt" ? "primary" : "ghost"} size="compact" onClick={() => setView("gantt")} aria-pressed={view === "gantt"}>Gantt</Button></div>}</div></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {editing && !readOnly ? <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{schedule ? "Editar filas" : "Crear filas"}</h3><Button type="button" variant="secondary" onClick={() => setRowEditor(null)}>Añadir fila</Button></div>
      <DataTable className="!text-xs" pagination={false} rows={draftItems} columns={editableColumns} rowKey={(item) => item.id} emptyMessage="Añade la primera fila del cronograma." />
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={cancelEditing} disabled={pending}>Cancelar</Button><Button type="button" variant="primary" loading={pending} onClick={() => void saveSchedule()}>{pending ? "Guardando…" : "Guardar cronograma"}</Button></div>
    </> : <>
      {view === "table" ? <DataTable className="!text-xs" pagination={false} rows={items} columns={readOnlyColumns} rowKey={(item) => item.id} emptyMessage="Aún no hay filas en el cronograma." /> : <ScheduleGantt items={items} />}
    </>}
    {!readOnly && <CreateDialog title={rowEditor ? "Editar fila del cronograma" : "Añadir fila al cronograma"} triggerLabel="Añadir fila" open={rowEditor !== undefined} onOpenChange={(open) => { if (!open) setRowEditor(undefined); }} showTrigger={false}><ScheduleRowForm initial={rowEditor ?? undefined} onSaved={saveRow} onPendingChange={() => undefined} /></CreateDialog>}
  </div>;
}
