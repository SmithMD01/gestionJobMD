"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CreateDialog } from "../create-dialog";
import type { ProjectActivity } from "./project-activities";

export type ProjectModule = { id: string; projectId: string; parentId: string | null; name: string; description: string; sortOrder: number; isActive: boolean };
type Stage = { id: string; name: string };

function moduleProgress(module: ProjectModule, activities: ProjectActivity[], stages: Stage[]) {
  const items = activities.filter((item) => item.type === "development" && item.moduleId === module.id && item.status !== "cancelled");
  if (!items.length || stages.length < 2) return { count: items.length, progress: 0 };
  const positions = new Map(stages.map((stage, index) => [stage.id, index]));
  const progress = Math.round(items.reduce((total, item) => total + ((positions.get(item.developmentStageId ?? "") ?? 0) / (stages.length - 1)) * 100, 0) / items.length);
  return { count: items.length, progress };
}

function ProjectModuleForm({ projectId, initial, modules, onSaved, onPendingChange }: { projectId: string; initial?: ProjectModule; modules: ProjectModule[]; onSaved: (module: ProjectModule) => void; onPendingChange: (pending: boolean) => void }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPendingChange(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get("name") ?? "").trim(), description: String(form.get("description") ?? "").trim(), parentId: String(form.get("parentId") || "") || null, sortOrder: Number(form.get("sortOrder") || 0) };
    try {
      const response = await fetch(initial ? `/api/projects/${projectId}/modules/${initial.id}` : `/api/projects/${projectId}/modules`, { method: initial ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.module) { setError(result?.error || "No se pudo guardar el módulo."); return; }
      onSaved(result.module as ProjectModule);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { onPendingChange(false); }
  }
  return <form onSubmit={submit} className="grid gap-4">
    <label className="block text-sm font-medium">Nombre<input name="name" required maxLength={120} defaultValue={initial?.name ?? ""} className="ui-field mt-1 block" /></label>
    <label className="block text-sm font-medium">Módulo padre<select name="parentId" defaultValue={initial?.parentId ?? ""} className="ui-field mt-1 block"><option value="">Módulo principal</option>{modules.filter((module) => !module.parentId && module.id !== initial?.id).map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select><span className="mt-1 block text-xs text-subtle">Los submódulos tienen un solo nivel de profundidad.</span></label>
    <label className="block text-sm font-medium">Descripción<span className="mt-1 block text-xs font-normal text-subtle">Opcional</span><textarea name="description" maxLength={1000} rows={3} defaultValue={initial?.description ?? ""} className="ui-field mt-1 block" /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button className="ui-button ui-button-primary">{initial ? "Guardar cambios" : "Crear módulo"}</button>
  </form>;
}

export function ProjectModules({ projectId, initialModules, activities, stages, onModulesChange }: { projectId: string; initialModules: ProjectModule[]; activities: ProjectActivity[]; stages: Stage[]; onModulesChange: (modules: ProjectModule[]) => void }) {
  const [modules, setModules] = useState(initialModules);
  const [editor, setEditor] = useState<ProjectModule | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ProjectModule | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const childrenByParent = useMemo(() => new Map(modules.filter((module) => module.parentId).map((module) => [module.parentId!, (modules.filter((candidate) => candidate.parentId === module.parentId).length)])), [modules]);
  function update(next: ProjectModule[]) { setModules(next); onModulesChange(next); }
  function saved(item: ProjectModule) { update(editor ? modules.map((module) => module.id === item.id ? item : module) : [...modules, item]); setEditor(undefined); }
  async function remove() {
    if (!deleting || pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/modules/${deleting.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error || "No se pudo eliminar el módulo."); return; }
      update(modules.filter((module) => module.id !== deleting.id)); setDeleting(null);
    } catch { setError("No se pudo conectar. Vuelve a intentarlo."); } finally { setPending(false); }
  }
  return <section className="mb-6 border-b border-line pb-5" aria-labelledby="project-modules-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="project-modules-title" className="text-base font-semibold">Módulos y submódulos</h2><p className="mt-1 text-xs text-subtle">Relaciona cada actividad de desarrollo con la parte del proyecto que le corresponde.</p></div><CreateDialog title={editor ? "Editar módulo" : "Crear módulo"} triggerLabel="Nuevo módulo" open={editor !== undefined} onOpenChange={(open) => { if (open) setEditor(null); else if (!pending) setEditor(undefined); }} busy={pending}><ProjectModuleForm key={editor?.id ?? "new"} projectId={projectId} initial={editor ?? undefined} modules={modules} onSaved={saved} onPendingChange={setPending} /></CreateDialog></div>
    {modules.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-line bg-canvas px-3 py-4 text-sm text-muted">Aún no hay módulos. Crea el primero para organizar el desarrollo.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.filter((module) => !module.parentId).map((module) => { const stats = moduleProgress(module, activities, stages); const childCount = childrenByParent.get(module.id) ?? 0; return <article key={module.id} className="rounded-lg border border-line bg-canvas p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-ink">{module.name}</h3><p className="mt-1 text-[11px] text-subtle">{childCount} submódulo{childCount === 1 ? "" : "s"} · {stats.count} actividad{stats.count === 1 ? "" : "es"}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => setEditor(module)} className="ui-button ui-button-secondary !min-h-7 !px-2 !text-[11px]">Editar</button><button type="button" onClick={() => { setError(""); setDeleting(module); }} className="ui-button ui-button-danger !min-h-7 !px-2 !text-[11px]">Eliminar</button></div></div><div className="mt-3"><div className="flex items-center justify-between text-[11px]"><span className="text-subtle">Avance estimado</span><span className="font-semibold tabular-nums text-ink">{stats.progress}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${stats.progress}%` }} /></div></div>{module.description && <p className="mt-3 line-clamp-2 text-xs text-muted">{module.description}</p>}{modules.filter((child) => child.parentId === module.id).length > 0 && <div className="mt-3 space-y-1 border-t border-line pt-2">{modules.filter((child) => child.parentId === module.id).map((child) => { const childStats = moduleProgress(child, activities, stages); return <div key={child.id} className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate text-muted">↳ {child.name}</span><span className="flex shrink-0 items-center gap-1"><span className="tabular-nums text-subtle">{childStats.count} · {childStats.progress}%</span><button type="button" onClick={() => setEditor(child)} aria-label={`Editar ${child.name}`} className="ui-button ui-button-secondary !min-h-6 !px-1.5 !text-[10px]">Editar</button><button type="button" onClick={() => { setError(""); setDeleting(child); }} aria-label={`Eliminar ${child.name}`} className="ui-button ui-button-danger !min-h-6 !px-1.5 !text-[10px]">Eliminar</button></span></div>; })}</div>}</article>; })}</div>}
    <CreateDialog title="Eliminar módulo" triggerLabel="Eliminar módulo" open={deleting !== null} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }} busy={pending} showTrigger={false}>{deleting && <div className="space-y-4"><p className="text-sm leading-6 text-muted">¿Seguro que deseas eliminar <strong className="text-ink">{deleting.name}</strong>? Solo se puede eliminar si no tiene submódulos ni actividades relacionadas.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} disabled={pending} className="ui-button ui-button-secondary">Cancelar</button><button type="button" onClick={() => void remove()} disabled={pending} className="ui-button ui-button-danger">{pending ? "Eliminando…" : "Eliminar módulo"}</button></div></div>}</CreateDialog>
  </section>;
}
