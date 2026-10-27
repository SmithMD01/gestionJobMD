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
};

export function ProjectsPanel({ projects, companyName }: { projects: ProjectRow[]; companyName: string }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [status, setStatus] = useState("all");
  const columns: TableColumn<ProjectRow>[] = [
    { key: "name", label: "Proyecto", className: "w-[20%]", render: (item) => <Link href={`/projects/${item.id}`} className="font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink">{item.name}</Link> },
    { key: "objective", label: "Objetivo", className: "w-[32%]", render: (item) => <span className="line-clamp-2 max-w-lg text-muted" title={item.objective}>{item.objective}</span> },
    { key: "status", label: "Estado", className: "w-[13%]", render: (item) => projectStatusLabel[item.status] },
    { key: "start", label: "Inicio", className: "w-[12%] whitespace-nowrap", render: (item) => formatProjectDate(item.startDate) },
    { key: "end", label: "Fin previsto", className: "w-[13%] whitespace-nowrap", render: (item) => formatProjectDate(item.endDate) },
    { key: "actions", label: "Acciones", className: "w-[10%]", render: (item) => <RowActions label={item.name} actions={[
      { label: "Ver detalle", href: `/projects/${item.id}` },
      { label: "Editar", onSelect: () => setEditingProject(item) },
    ]} /> },
  ];

  return (
    <>
      <ModuleHeader title="Proyectos" description={`${companyName} · Organiza objetivos, fechas y avances.`} action={
        <CreateDialog title="Nuevo proyecto" triggerLabel="Nuevo proyecto" open={createOpen} onOpenChange={setCreateOpen} busy={createPending}><ProjectForm embedded onPendingChange={setCreatePending} /></CreateDialog>
      } />
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
        emptyMessage={projects.length === 0 ? "Aún no hay proyectos. Crea el primero para empezar." : "No hay proyectos que coincidan con los filtros."}
      />
      <CreateDialog title="Editar proyecto" triggerLabel="Editar proyecto" showTrigger={false} open={editingProject !== null} onOpenChange={(open) => { if (!open) setEditingProject(null); }} busy={editPending}>
        {editingProject && <ProjectForm key={editingProject.id} initial={editingProject} embedded onPendingChange={setEditPending} onSaved={() => setEditingProject(null)} />}
      </CreateDialog>
    </>
  );
}
