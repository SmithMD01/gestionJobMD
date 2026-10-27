
"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { RowActions } from "../row-actions";
import { documentationGroups, documentationStatusLabels, documentationStatuses, type DocumentationStatus } from "@/modules/projects/documentation";
import { Button } from "@/components/ui/button";

export type ProjectDocument = {
  id: string;
  projectId: string;
  groupId: string;
  typeId: string;
  title: string;
  version: number;
  status: DocumentationStatus;
  isFinal: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do { value /= 1024; unitIndex += 1; } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-PE");
}

function StarIcon({ active }: { active: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="size-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3.75 2.55 5.16 5.7.83-4.12 4.02.97 5.68L12 16.76l-5.1 2.68.97-5.68-4.12-4.02 5.7-.83L12 3.75Z" />
  </svg>;
}

function DocumentUploadForm({ projectId, initialGroupId, initialTypeId, initialTitle, onSaved, onPendingChange }: { projectId: string; initialGroupId?: string; initialTypeId?: string; initialTitle?: string; onSaved: (document: ProjectDocument) => void; onPendingChange: (pending: boolean) => void }) {
  const firstGroup = initialGroupId ?? documentationGroups[0].id;
  const [groupId, setGroupId] = useState(firstGroup);
  const [typeId, setTypeId] = useState(initialTypeId ?? documentationGroups.find((group) => group.id === firstGroup)?.types[0][0] ?? "");
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");

  function changeGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    setTypeId(documentationGroups.find((group) => group.id === nextGroupId)?.types[0][0] ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    onPendingChange(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("groupId", groupId);
    form.set("typeId", typeId);
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.document) { setError(result?.error || "No se pudo adjuntar el documento."); return; }
      onSaved(result.document as ProjectDocument);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { submitLock.current = false; setPending(false); onPendingChange(false); }
  }

  const types = documentationGroups.find((group) => group.id === groupId)?.types ?? [];
  return <form onSubmit={submit} className="grid gap-4">
    <label className="block text-sm font-medium">Sección<select value={groupId} onChange={(event) => changeGroup(event.target.value)} className="ui-field mt-1 block">{documentationGroups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
    <label className="block text-sm font-medium">Tipo de documento<select value={typeId} onChange={(event) => setTypeId(event.target.value)} className="ui-field mt-1 block">{types.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label className="block text-sm font-medium">Título<span className="mt-1 block text-xs font-normal text-subtle">Si lo dejas vacío se usará el nombre del tipo.</span><input name="title" maxLength={160} defaultValue={initialTitle ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium">Estado<select name="status" defaultValue="draft" className="ui-field mt-1 block">{documentationStatuses.map((status) => <option key={status} value={status}>{documentationStatusLabels[status]}</option>)}</select></label>
    <label className="block text-sm font-medium">Archivo<input name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.csv,.json,.zip" className="ui-field mt-1 block" /><span className="mt-1 block text-xs font-normal text-subtle">Máximo 10 MB. La nueva carga se guardará como la siguiente versión.</span></label>
    <label className="block text-sm font-medium">Notas<span className="mt-1 block text-xs font-normal text-subtle">Opcional</span><textarea name="notes" maxLength={2000} rows={3} className="ui-field mt-1 block" /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button variant="primary" loading={pending}>{pending ? "Adjuntando…" : "Adjuntar documento"}</Button>
  </form>;
}

function DocumentSettingsForm({ projectId, document, onSaved, onPendingChange }: { projectId: string; document: ProjectDocument; onSaved: (document: ProjectDocument) => void; onPendingChange: (pending: boolean) => void }) {
  const [status, setStatus] = useState<DocumentationStatus>(document.status);
  const [notes, setNotes] = useState(document.notes);
  const [isFinal, setIsFinal] = useState(document.isFinal);
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    onPendingChange(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${document.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, notes, isFinal }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.document) { setError(result?.error || "No se pudo guardar el documento."); return; }
      onSaved(result.document as ProjectDocument);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { submitLock.current = false; setPending(false); onPendingChange(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-lg bg-note p-3 text-sm"><p className="font-medium text-ink">{document.title} · v{document.version}</p><p className="mt-1 text-xs text-muted">{document.fileName} · {formatSize(document.fileSize)}</p></div>
    <label className="block text-sm font-medium">Estado<select value={status} onChange={(event) => { const next = event.target.value as DocumentationStatus; setStatus(next); if (next !== "approved") setIsFinal(false); }} className="ui-field mt-1 block">{documentationStatuses.map((item) => <option key={item} value={item}>{documentationStatusLabels[item]}</option>)}</select></label>
    <label className="block text-sm font-medium">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} className="ui-field mt-1 block" /></label>
    <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm"><input type="checkbox" checked={isFinal} disabled={status !== "approved"} onChange={(event) => setIsFinal(event.target.checked)} /><span><span className="block font-medium text-ink">Marcar como versión vigente ★</span><span className="mt-1 block text-xs text-muted">Solo las versiones aprobadas pueden ser vigentes. Al marcarla, se quitará la estrella de la versión anterior.</span></span></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button variant="primary" loading={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
  </form>;
}

export function ProjectDocumentation({ projectId, initialDocuments }: { projectId: string; initialDocuments: ProjectDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [upload, setUpload] = useState<{ groupId?: string; typeId?: string; title?: string } | null>(null);
  const [settings, setSettings] = useState<ProjectDocument | null>(null);
  const [deleting, setDeleting] = useState<ProjectDocument | null>(null);
  const [pending, setPending] = useState(false);
  const actionLock = useRef(false);
  const [error, setError] = useState("");
  const docsByType = useMemo(() => new Map(documentationGroups.flatMap((group) => group.types.map(([typeId]) => [`${group.id}:${typeId}`, documents.filter((document) => document.groupId === group.id && document.typeId === typeId)]))), [documents]);
  function replaceDocument(document: ProjectDocument) {
    setDocuments((current) => current.map((item) => item.id === document.id ? document : document.isFinal && item.groupId === document.groupId && item.typeId === document.typeId ? { ...item, isFinal: false } : item));
  }
  function saved(document: ProjectDocument) { setDocuments((current) => { const exists = current.some((item) => item.id === document.id); return exists ? current.map((item) => item.id === document.id ? document : document.isFinal && item.groupId === document.groupId && item.typeId === document.typeId ? { ...item, isFinal: false } : item) : [document, ...current]; }); setUpload(null); setSettings(null); }
  async function toggleFinal(document: ProjectDocument) {
    if (actionLock.current) return;
    if (document.status !== "approved") { setError("Solo una versión aprobada puede marcarse como definitiva."); return; }
    actionLock.current = true;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${document.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: document.status, notes: document.notes, isFinal: !document.isFinal }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.document) { setError(result?.error || "No se pudo actualizar la versión definitiva."); return; }
      replaceDocument(result.document as ProjectDocument);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { actionLock.current = false; setPending(false); }
  }
  async function remove() {
    if (!deleting || actionLock.current) return;
    actionLock.current = true;
    setPending(true); setError("");
    try { const response = await fetch(`/api/projects/${projectId}/documents/${deleting.id}`, { method: "DELETE" }); const result = await response.json().catch(() => null); if (!response.ok) { setError(result?.error || "No se pudo eliminar el documento."); return; } setDocuments((current) => current.filter((item) => item.id !== deleting.id)); setDeleting(null); } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { actionLock.current = false; setPending(false); }
  }
  return <div className="mt-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Documentación</h2><p className="mt-1 text-xs text-subtle">Organiza documentos funcionales, técnicos y operativos por tipo y versión.</p></div><Button type="button" variant="primary" onClick={() => setUpload({})}>Adjuntar documento</Button></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <div className="mt-5 space-y-3">
      {documentationGroups.map((group) => {
        const groupCount = documents.filter((document) => document.groupId === group.id).length;

        return <details key={group.id} open className="rounded-xl border border-line bg-canvas">
          <summary className="group flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
            <span>{group.label}<span className="ml-2 text-xs font-normal text-muted">{groupCount} {groupCount === 1 ? "documento" : "documentos"}</span></span>
            <span aria-hidden="true" className="text-base text-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            {group.types.map(([typeId, typeLabel]) => {
              const versions = docsByType.get(`${group.id}:${typeId}`) ?? [];
              const columns: TableColumn<ProjectDocument>[] = [
                {
                  key: "final",
                  label: "Final",
                  className: "w-16",
                  render: (item) => <Button
                    type="button"
                    variant={item.isFinal ? "warning" : "ghost"}
                    size="icon"
                    onClick={() => void toggleFinal(item)}
                    disabled={pending || item.status !== "approved"}
                    aria-label={item.isFinal ? `Quitar versión definitiva de v${item.version}` : `Marcar v${item.version} como definitiva`}
                    title={item.status !== "approved" ? "Aprueba la versión para marcarla como definitiva" : item.isFinal ? "Versión definitiva" : "Marcar como definitiva"}
                    className={`!size-7 !min-w-7 rounded-md ${item.status !== "approved" ? "text-muted/50" : ""}`}
                  ><StarIcon active={item.isFinal} /></Button>
                },
                { key: "version", label: "Versión", className: "w-20", render: (item) => <span className="font-medium">v{item.version}</span> },
                {
                  key: "document",
                  label: "Documento",
                  className: "min-w-56",
                  render: (item) => <div className="min-w-0">
                    <p className="truncate font-medium text-ink" title={item.title}>{item.title}</p>
                    <a href={`/api/projects/${projectId}/documents/${item.id}/download`} className="mt-0.5 block max-w-64 truncate text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline" title={item.fileName}>{item.fileName}</a>
                  </div>
                },
                { key: "status", label: "Estado", render: (item) => documentationStatusLabels[item.status] },
                { key: "size", label: "Tamaño", render: (item) => formatSize(item.fileSize) },
                { key: "date", label: "Actualizado", render: (item) => formatDate(item.updatedAt) },
                { key: "actions", label: "Acciones", render: (item) => <RowActions label={`${typeLabel} v${item.version}`} actions={[{ label: "Editar estado", onSelect: () => setSettings(item) }, { label: "Nueva versión", onSelect: () => setUpload({ groupId: group.id, typeId, title: item.title }) }, { label: "Eliminar", tone: "danger", onSelect: () => { setError(""); setDeleting(item); } }]} /> }
              ];

              return <section key={typeId} aria-labelledby={`document-type-${group.id}-${typeId}`}>
                <div className="flex items-center justify-between gap-3">
                  <div><h3 id={`document-type-${group.id}-${typeId}`} className="text-sm font-semibold text-ink">{typeLabel}</h3>{versions.length === 0 && <p className="mt-1 text-xs text-muted">Aún no hay versiones adjuntas.</p>}</div>
                  {versions.length > 0 && <Button type="button" variant="secondary" size="compact" onClick={() => setUpload({ groupId: group.id, typeId, title: versions[0]?.title })}>Nueva versión</Button>}
                </div>
                {versions.length > 0 && <DataTable className="!text-xs" containerClassName="!mt-2" pagination={false} rows={versions} rowKey={(item) => item.id} emptyMessage="Sin versiones" columns={columns} />}
              </section>;
            })}
          </div>
        </details>;
      })}
    </div>
    <CreateDialog title={upload?.typeId ? "Nueva versión documental" : "Adjuntar documento"} triggerLabel="Adjuntar documento" showTrigger={false} open={upload !== null} onOpenChange={(open) => { if (!open && !pending) setUpload(null); }} busy={pending}>{upload && <DocumentUploadForm key={`${upload.groupId ?? "new"}:${upload.typeId ?? "new"}`} projectId={projectId} initialGroupId={upload.groupId} initialTypeId={upload.typeId} initialTitle={upload.title} onPendingChange={setPending} onSaved={saved} />}</CreateDialog>
    <CreateDialog title="Editar documento" triggerLabel="Editar documento" showTrigger={false} open={settings !== null} onOpenChange={(open) => { if (!open && !pending) setSettings(null); }} busy={pending}>{settings && <DocumentSettingsForm key={settings.id} projectId={projectId} document={settings} onPendingChange={setPending} onSaved={saved} />}</CreateDialog>
    <CreateDialog title="Eliminar documento" triggerLabel="Eliminar documento" showTrigger={false} open={deleting !== null} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }} busy={pending}>{deleting && <div className="space-y-4"><p className="text-sm leading-6 text-muted">¿Seguro que deseas eliminar <strong className="text-ink">{deleting.title} v{deleting.version}</strong>? Esta acción no se puede deshacer.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(null)} disabled={pending}>Cancelar</Button><Button type="button" variant="danger" loading={pending} onClick={() => void remove()}>{pending ? "Eliminando…" : "Eliminar documento"}</Button></div></div>}</CreateDialog>
  </div>;
}
