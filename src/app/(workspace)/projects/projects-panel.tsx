"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ModuleHeader } from "../module-layout";
import { RowActions } from "../row-actions";
import { formatProjectDate, projectStatusLabel, type ProjectStatus } from "@/modules/projects/constants";
import { ProjectForm } from "./project-form";

type ProjectRow = {
  id: string;
  name: string;
  objective: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  progress: { generalCount: number; completedGeneral: number; developmentCount: number; completedDevelopment: number; total: number; completed: number; percent: number };
  scheduleCount: number;
  scheduleCompleted: number;
};

export function ProjectsPanel({ projects, companyName, readOnly = false }: { projects: ProjectRow[]; companyName: string; readOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [status, setStatus] = useState("all");
  const columns: TableColumn<ProjectRow>[] = [
    { key: "name", label: "Proyecto", className: "w-[20%]", render: (item) => <span className="block"><Link href={`/projects/${item.id}`} className="font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink">{item.name}</Link><span className="group relative mt-1.5 block h-1.5 w-28 rounded-full bg-line" tabIndex={0} role="img" aria-label={`Avance de actividades: ${item.progress.percent} por ciento. ${item.progress.completedGeneral} de ${item.progress.generalCount} actividades generales y ${item.progress.completedDevelopment} de ${item.progress.developmentCount} de desarrollo completadas.`}><span className="block h-full rounded-full bg-accent" style={{ width: `${item.progress.percent}%` }} /><span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-64 rounded-lg border border-line bg-surface p-3 text-[11px] font-normal text-ink shadow-xl group-hover:block group-focus:block"><span className="block font-semibold">Avance de actividades · {item.progress.percent}%</span><span className="mt-1 block">Generales: {item.progress.completedGeneral}/{item.progress.generalCount} completadas</span><span className="block">Desarrollo: {item.progress.completedDevelopment}/{item.progress.developmentCount} completadas</span><span className="mt-1 block text-muted">Cronograma: {item.scheduleCompleted}/{item.scheduleCount} etapas completadas</span></span></span></span> },
    { key: "objective", label: "Objetivo", className: "w-[32%]", render: (item) => <span className="line-clamp-2 max-w-lg text-muted" title={item.objective}>{item.objective}</span> },
    { key: "status", label: "Estado", className: "w-[13%]", render: (item) => projectStatusLabel[item.status] },
    { key: "start", label: "Inicio", className: "w-[12%] whitespace-nowrap", render: (item) => formatProjectDate(item.startDate) },
    { key: "end", label: "Fin previsto", className: "w-[13%] whitespace-nowrap", render: (item) => formatProjectDate(item.endDate) },
    { key: "actions", label: "Acciones", className: "w-[10%]", render: (item) => <RowActions label={item.name} actions={[
      { label: "Ver detalle", href: `/projects/${item.id}` },
      ...(!readOnly ? [{ label: "Editar", onSelect: () => setEditingProject(item) }] : []),
    ]} /> },
  ];

  return (
    <>
      <ModuleHeader title="Proyectos" description={`${companyName} · Organiza objetivos, fechas y avances.`} action={
        !readOnly && <CreateDialog title="Nuevo proyecto" triggerLabel="Nuevo proyecto" open={createOpen} onOpenChange={setCreateOpen} busy={createPending}><ProjectForm embedded onPendingChange={setCreatePending} /></CreateDialog>
      } />
      {readOnly && <p role="status" className="mt-4 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-muted">Esta empresa está inactiva. Puedes consultar sus proyectos, pero no modificarlos.</p>}
      <DataTable
        rows={projects}
        filterKey={JSON.stringify([query, status])}
        filterRow={(item) => item.name.toLocaleLowerCase("es-PE").includes(query.trim().toLocaleLowerCase("es-PE")) && (status === "all" || item.status === status)}
        toolbar={<>
        <label className="min-w-52 flex-1 text-sm font-medium"><span className="sr-only">Buscar proyecto</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto" className="ui-field block" />
        </label>
        <label className="min-w-44 text-sm font-medium">Estado
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="ui-field mt-1 block">
            <option value="all">Todos</option>
            {Object.entries(projectStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        </>}
        columns={columns}
        rowKey={(item) => item.id}
        emptyMessage={projects.length === 0 ? (readOnly ? "Esta empresa no tiene proyectos registrados." : "Aún no hay proyectos. Crea el primero para empezar.") : "No hay proyectos que coincidan con los filtros."}
      />
      {!readOnly && <CreateDialog title="Editar proyecto" triggerLabel="Editar proyecto" showTrigger={false} open={editingProject !== null} onOpenChange={(open) => { if (!open) setEditingProject(null); }} busy={editPending}>
        {editingProject && <ProjectForm key={editingProject.id} initial={editingProject} embedded onPendingChange={setEditPending} onSaved={() => setEditingProject(null)} />}
      </CreateDialog>}
    </>
  );
}
