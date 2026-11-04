"use client";

import { useMemo, useState, type FormEvent } from "react";
import * as XLSX from "xlsx";
import { CreateDialog } from "../create-dialog";
import { RowActions } from "../row-actions";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

export type ProjectDependency = {
  id: string;
  projectId: string;
  externalCode: string | null;
  title: string;
  description: string;
  category: "document" | "workflow" | "business_rule" | "data" | "other";
  status: "pending" | "answered" | "awaiting_confirmation" | "resolved";
  response: string;
  dueDate: string | null;
  answeredAt: Date | string | null;
  confirmedAt: Date | string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  relatedDependencyIds: string[];
};

const categoryLabels: Record<ProjectDependency["category"], string> = {
  document: "Documento o plantilla", workflow: "Flujo", business_rule: "Regla de negocio", data: "Consulta de lógica o datos", other: "Otro",
};
const statusLabels: Record<ProjectDependency["status"], string> = {
  pending: "Pendiente", answered: "Respondido", awaiting_confirmation: "En validación", resolved: "Confirmado / subsanado",
};

function formatDate(value: string | Date | null) {
  return value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(new Date(value)) : "—";
}

function displayCode(item: ProjectDependency) {
  return item.externalCode ?? `DEP-${item.id.slice(0, 8).toLocaleUpperCase()}`;
}

function DependencyCodeTooltip({ item, tooltipId, onSelect }: { item: ProjectDependency; tooltipId: string; onSelect: () => void }) {
  return <span className="group relative inline-flex">
    <button type="button" onClick={onSelect} className="font-mono text-xs font-semibold text-accent underline-offset-2 hover:underline focus-visible:underline" aria-label={`Ver dependencia ${displayCode(item)}`} aria-describedby={tooltipId}>{displayCode(item)}</button>
    <span id={tooltipId} role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-72 whitespace-normal break-words rounded-lg border border-line bg-ink px-3 py-2 text-xs font-normal leading-5 text-on-primary shadow-lg [overflow-wrap:anywhere] group-hover:block group-focus-within:block">
      <strong className="block">{item.title}</strong>
      <span className="mt-1 block opacity-90">{item.description || "Sin detalle adicional."}</span>
    </span>
  </span>;
}

function DependencyForm({ projectId, initial, dependencies, onSaved, onPendingChange }: {
  projectId: string;
  initial?: ProjectDependency;
  dependencies: ProjectDependency[];
  onSaved: (dependency: ProjectDependency) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [relatedIds, setRelatedIds] = useState(initial?.relatedDependencyIds ?? []);
  const [relatedSearch, setRelatedSearch] = useState("");
  const relatedCandidates = dependencies.filter((item) => item.id !== initial?.id);
  const filteredRelated = relatedCandidates.filter((item) => `${displayCode(item)} ${item.title} ${item.description}`.toLocaleLowerCase().includes(relatedSearch.toLocaleLowerCase()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); onPendingChange(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      externalCode: String(form.get("externalCode") ?? "").trim() || null,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      category: String(form.get("category") ?? "other"),
      status: String(form.get("status") ?? "pending"),
      response: String(form.get("response") ?? ""),
      dueDate: String(form.get("dueDate") ?? "") || null,
      relatedDependencyIds: relatedIds,
    };
    try {
      const response = await fetch(initial ? `/api/projects/${projectId}/dependencies/${initial.id}` : `/api/projects/${projectId}/dependencies`, {
        method: initial ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.dependency) throw new Error(result?.error ?? "No se pudo guardar el punto.");
      onSaved(result.dependency);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el punto.");
    } finally { setPending(false); onPendingChange(false); }
  }

  return <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
    <label className="block text-sm font-medium">Código de la fábrica <span className="font-normal text-subtle">(opcional)</span><input name="externalCode" maxLength={80} defaultValue={initial?.externalCode ?? ""} placeholder="Ej. FSW-12" className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium">Categoría<select name="category" defaultValue={initial?.category ?? "other"} className="ui-field mt-1 block">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium sm:col-span-2">Punto o consulta<input name="title" required maxLength={200} defaultValue={initial?.title ?? ""} placeholder="Resume la consulta o dependencia" className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium sm:col-span-2">Detalle<textarea name="description" maxLength={5000} rows={3} defaultValue={initial?.description ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium">Estado<select name="status" defaultValue={initial?.status ?? "pending"} className="ui-field mt-1 block">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium">Fecha objetivo<input name="dueDate" type="date" defaultValue={initial?.dueDate ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium sm:col-span-2">Respuesta o información entregada<textarea name="response" maxLength={5000} rows={3} defaultValue={initial?.response ?? ""} placeholder="Registra la explicación, acuerdo o documento compartido" className="ui-field mt-1 block" /></label>
    <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Depende de</legend><input type="search" value={relatedSearch} onChange={(event) => setRelatedSearch(event.target.value)} placeholder="Buscar por código o nombre" aria-label="Buscar dependencias para relacionar" className="ui-field mt-1 block" />{relatedIds.length > 0 && <p className="mt-1 text-xs text-subtle">{relatedIds.length} punto(s) seleccionado(s)</p>}<div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-line bg-canvas p-2">{relatedCandidates.length === 0 ? <p className="px-2 py-1 text-xs text-muted">Registra otro punto para poder relacionarlo.</p> : filteredRelated.length === 0 ? <p className="px-2 py-1 text-xs text-muted">No hay puntos que coincidan con la búsqueda.</p> : filteredRelated.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface"><input type="checkbox" checked={relatedIds.includes(item.id)} onChange={(event) => setRelatedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><span className="font-mono font-semibold text-accent">{displayCode(item)}</span><span className="truncate">{item.title}</span></label>)}</div></fieldset>
    <p className="text-xs text-subtle sm:col-span-2">Al pasar el mouse sobre el código en la tabla se muestra el resumen del punto. El ID interno permanece separado del código de referencia.</p>
    {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
    <div className="flex justify-end sm:col-span-2"><Button variant="primary" loading={pending}>{pending ? "Guardando…" : initial ? "Guardar cambios" : "Registrar dependencia"}</Button></div>
  </form>;
}

export function ProjectDependencies({ projectId, readOnly = false, initialDependencies }: { projectId: string; readOnly?: boolean; initialDependencies: ProjectDependency[] }) {
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [editor, setEditor] = useState<ProjectDependency | null | undefined>(undefined);
  const [detail, setDetail] = useState<ProjectDependency | null>(null);
  const [deleting, setDeleting] = useState<ProjectDependency | null>(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState("");

  const visibleItems = useMemo(() => dependencies.filter((item) => (status === "all" || item.status === status) && (category === "all" || item.category === category) && (!search || [item.externalCode, item.title, item.description, item.response].some((value) => value?.toLocaleLowerCase().includes(search.toLocaleLowerCase())))).sort((a, b) => a.sortOrder - b.sortOrder), [dependencies, status, category, search]);

  function save(item: ProjectDependency) {
    setDependencies((current) => editor ? current.map((row) => row.id === item.id ? item : row) : [...current, item]);
    setEditor(undefined); setDetail(null);
  }

  async function remove() {
    if (!deleting || pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/dependencies/${deleting.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No se pudo eliminar el punto.");
      setDependencies((current) => current.filter((item) => item.id !== deleting.id).map((item) => ({ ...item, relatedDependencyIds: item.relatedDependencyIds.filter((id) => id !== deleting.id) })));
      setDeleting(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el punto."); }
    finally { setPending(false); }
  }

  async function move(item: ProjectDependency, delta: -1 | 1) {
    if (pending) return;
    const ordered = [...dependencies].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((row) => row.id === item.id); const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/dependencies/order`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderedIds: ordered.map((row) => row.id) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result?.dependencies)) throw new Error(result?.error ?? "No se pudo cambiar el orden.");
      setDependencies(result.dependencies.map((row: ProjectDependency) => ({ ...row, relatedDependencyIds: dependencies.find((item) => item.id === row.id)?.relatedDependencyIds ?? [] })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar el orden."); }
    finally { setPending(false); }
  }

  function exportExcel() {
    const rows = visibleItems.map((item, index) => ({
      "Orden": index + 1,
      "ID del sistema": item.id,
      "Código fábrica": item.externalCode ?? "",
      "Punto / consulta": item.title,
      "Detalle": item.description,
      "Categoría": categoryLabels[item.category],
      "Estado": statusLabels[item.status],
      "Depende de": item.relatedDependencyIds.map((id) => { const related = dependencies.find((entry) => entry.id === id); return related ? `${displayCode(related)} · ${related.title}` : ""; }).filter(Boolean).join(" | "),
      "Respuesta / información entregada": item.response,
      "Fecha objetivo": item.dueDate ?? "",
      "Respondido el": item.answeredAt ? formatDate(item.answeredAt) : "",
      "Confirmado el": item.confirmedAt ? formatDate(item.confirmedAt) : "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 10 }, { wch: 38 }, { wch: 20 }, { wch: 42 }, { wch: 55 }, { wch: 24 }, { wch: 24 }, { wch: 50 }, { wch: 55 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Dependencias");
    XLSX.writeFile(book, `dependencias-${projectId.slice(0, 8)}.xlsx`);
  }

  const columns: TableColumn<ProjectDependency>[] = [
    { key: "code", label: "Código", className: "whitespace-nowrap", render: (item) => <DependencyCodeTooltip item={item} tooltipId={`dependency-tip-${item.id}`} onSelect={() => setDetail(item)} /> },
    { key: "title", label: "Punto / consulta", render: (item) => <button type="button" onClick={() => setDetail(item)} className="max-w-[24rem] text-left font-medium text-ink hover:text-accent">{item.title}</button> },
    { key: "category", label: "Categoría", render: (item) => categoryLabels[item.category] },
    { key: "relations", label: "Depende de", render: (item) => item.relatedDependencyIds.length ? <div className="flex flex-wrap gap-2">{item.relatedDependencyIds.map((id) => { const related = dependencies.find((entry) => entry.id === id); if (!related) return null; return <DependencyCodeTooltip key={id} item={related} tooltipId={`dependency-tip-${item.id}-${related.id}`} onSelect={() => setDetail(related)} />; })}</div> : <span className="text-muted">—</span> },
    { key: "status", label: "Estado", render: (item) => <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${item.status === "resolved" ? "bg-success/10 text-success" : item.status === "answered" || item.status === "awaiting_confirmation" ? "bg-warning/10 text-warning" : "bg-canvas text-muted"}`}>{statusLabels[item.status]}</span> },
    { key: "dueDate", label: "Fecha objetivo", render: (item) => formatDate(item.dueDate) },
    { key: "actions", label: "Acciones", className: "w-[1%] whitespace-nowrap", render: (item) => { const ordered = [...dependencies].sort((a, b) => a.sortOrder - b.sortOrder); const orderIndex = ordered.findIndex((row) => row.id === item.id); return <div className="flex items-center justify-end gap-1">{!readOnly && <><Button type="button" variant="secondary" size="icon" disabled={pending || orderIndex === 0} onClick={() => void move(item, -1)} aria-label={`Mover ${item.title} arriba`} title="Mover arriba">↑</Button><Button type="button" variant="secondary" size="icon" disabled={pending || orderIndex === ordered.length - 1} onClick={() => void move(item, 1)} aria-label={`Mover ${item.title} abajo`} title="Mover abajo">↓</Button></>}<RowActions label={item.title} actions={[{ label: "Ver detalle", onSelect: () => setDetail(item) }, ...(!readOnly ? [{ label: "Editar", onSelect: () => setEditor(item) }, { label: "Eliminar", tone: "danger" as const, onSelect: () => { setError(""); setDeleting(item); } }] : [])]} /></div>; } },
  ];

  return <div className="mt-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Dependencias</h2><p className="mt-1 max-w-3xl text-xs text-subtle">Mapea las consultas de la fábrica, registra las respuestas y confirma cada punto cuando te indiquen que quedó claro. El código externo se conserva junto al ID interno.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="success" onClick={exportExcel}>Descargar Excel</Button>{!readOnly && <CreateDialog title={editor ? "Editar dependencia" : "Registrar dependencia"} triggerLabel="Nueva dependencia" open={editor !== undefined} onOpenChange={(open) => { if (open) setEditor(null); else if (!pending) setEditor(undefined); }} busy={pending}><DependencyForm projectId={projectId} initial={editor ?? undefined} dependencies={dependencies} onSaved={save} onPendingChange={setPending} /></CreateDialog>}</div></div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-line px-2.5 py-1">{dependencies.length} puntos registrados</span><span className="rounded-full border border-line px-2.5 py-1">{dependencies.filter((item) => item.status === "pending").length} pendientes</span><span className="rounded-full border border-line px-2.5 py-1">{dependencies.filter((item) => item.status === "answered" || item.status === "awaiting_confirmation").length} por validar</span><span className="rounded-full border border-line px-2.5 py-1">{dependencies.filter((item) => item.status === "resolved").length} confirmados</span></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <DataTable className="!text-xs [&_th]:!py-2.5 [&_td]:!py-2.5" rows={visibleItems} rowKey={(item) => item.id} emptyMessage="Aún no hay dependencias registradas." filterKey={`${search}-${status}-${category}`} toolbar={<div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_13rem]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código o consulta" aria-label="Buscar dependencias" className="ui-field" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado" className="ui-field"><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoría" className="ui-field"><option value="all">Todas las categorías</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>} columns={columns} />

    <CreateDialog title="Detalle de dependencia" triggerLabel="Detalle" showTrigger={false} open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
      {detail && <div className="space-y-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs font-semibold text-accent">{displayCode(detail)} <span className="font-normal text-muted">· ID {detail.id}</span></p><h3 className="mt-1 text-base font-semibold">{detail.title}</h3></div><span className="rounded-full bg-canvas px-2 py-1 text-xs">{statusLabels[detail.status]}</span></div><section><h4 className="text-xs font-semibold uppercase tracking-wide text-subtle">Detalle</h4><p className="mt-1 whitespace-pre-wrap text-ink">{detail.description || "Sin detalle registrado."}</p></section><section><h4 className="text-xs font-semibold uppercase tracking-wide text-subtle">Respuesta o información entregada</h4><p className="mt-1 whitespace-pre-wrap text-ink">{detail.response || "Aún no se registra una respuesta."}</p></section><div className="grid gap-3 sm:grid-cols-2"><p><span className="text-xs text-subtle">Categoría</span><br />{categoryLabels[detail.category]}</p><p><span className="text-xs text-subtle">Fecha objetivo</span><br />{formatDate(detail.dueDate)}</p><p><span className="text-xs text-subtle">Respondido el</span><br />{formatDate(detail.answeredAt)}</p><p><span className="text-xs text-subtle">Confirmado el</span><br />{formatDate(detail.confirmedAt)}</p></div><section><h4 className="text-xs font-semibold uppercase tracking-wide text-subtle">Depende de</h4><div className="mt-1 flex flex-wrap gap-2">{detail.relatedDependencyIds.length ? detail.relatedDependencyIds.map((id) => { const item = dependencies.find((dependency) => dependency.id === id); return item ? <button type="button" key={id} onClick={() => setDetail(item)} className="rounded-md border border-line px-2 py-1 font-mono text-xs text-accent" title={item.description}>{displayCode(item)} · {item.title}</button> : null; }) : <span className="text-muted">Sin dependencias previas.</span>}</div></section>{!readOnly && <div className="flex justify-end"><Button type="button" variant="secondary" onClick={() => { setEditor(detail); setDetail(null); }}>Editar punto</Button></div>}</div>}
    </CreateDialog>
    {!readOnly && <CreateDialog title="Eliminar dependencia" triggerLabel="Eliminar dependencia" showTrigger={false} open={deleting !== null} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }} busy={pending}>{deleting && <div className="space-y-4"><p className="text-sm text-muted">¿Eliminar <strong className="text-ink">{deleting.externalCode ?? deleting.title}</strong>? Las relaciones hacia este punto también se quitarán.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleting(null)}>Cancelar</Button><Button type="button" variant="danger" loading={pending} onClick={() => void remove()}>{pending ? "Eliminando…" : "Eliminar"}</Button></div></div>}</CreateDialog>}
  </div>;
}
