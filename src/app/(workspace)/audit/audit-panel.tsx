"use client";

import { useMemo, useState } from "react";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ModuleHeader } from "../module-layout";

export type AuditRow = { id: string; entityType: string; entityId: string | null; entityName: string; action: string; changeDetail: string; actorName: string; createdAt: string };

const entityLabels: Record<string, string> = { project: "Proyecto", activity: "Actividad", company: "Empresa" };
const actionLabels: Record<string, string> = {
  "project.created": "Proyecto creado", "project.updated": "Proyecto actualizado", "project.deleted": "Proyecto eliminado",
  "project.schedule.created": "Cronograma creado", "project.schedule.updated": "Cronograma actualizado", "project.schedule.confirmed": "Cronograma confirmado",
  "activity.created": "Actividad creada", "activity.updated": "Actividad actualizada", "activity.deleted": "Actividad eliminada",
  "company.created": "Empresa creada", "company.updated": "Empresa actualizada", "company.deleted": "Empresa eliminada",
};

function formatDate(value: string) { return new Date(value).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }); }

function ChangeDetail({ value }: { value: string }) {
  const detail = value || "Sin detalle registrado";
  const hasTooltip = detail.length > 90;
  const preview = hasTooltip ? `${detail.slice(0, 87).trimEnd()}…` : detail;
  if (!hasTooltip) return <span className="text-muted">{preview}</span>;
  return <span tabIndex={0} className="group relative block max-w-[23rem] cursor-help truncate text-muted outline-none">
    {preview}
    <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-80 max-w-[calc(100vw-3rem)] whitespace-normal rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs font-normal leading-5 text-ink opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100">
      {detail}
    </span>
  </span>;
}

export function AuditPanel({ companyName, rows }: { companyName: string; rows: AuditRow[] }) {
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const actions = useMemo(() => Array.from(new Set(rows.map((row) => row.action))).sort(), [rows]);
  const columns: TableColumn<AuditRow>[] = [
    { key: "date", label: "Fecha", className: "whitespace-nowrap", render: (row) => <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time> },
    { key: "entity", label: "Módulo", render: (row) => entityLabels[row.entityType] ?? row.entityType },
    { key: "action", label: "Acción", render: (row) => <span className="font-medium text-ink">{actionLabels[row.action] ?? row.action}</span> },
    { key: "name", label: "Elemento", render: (row) => <span className="max-w-sm truncate text-muted" title={row.entityName || row.entityId || "—"}>{row.entityName || row.entityId || "—"}</span> },
    { key: "detail", label: "Cambio realizado", render: (row) => <ChangeDetail value={row.changeDetail} /> },
    { key: "actor", label: "Usuario", render: (row) => row.actorName },
  ];

  return <>
    <ModuleHeader title="Auditoría" description={`${companyName} · Registro de creación, edición y eliminación de proyectos, actividades y empresas.`} />
    <DataTable
      className="!text-xs"
      rows={rows}
      filterKey={JSON.stringify([entity, action])}
      filterRow={(row) => (entity === "all" || row.entityType === entity) && (action === "all" || row.action === action)}
      toolbar={<>
        <label className="min-w-44 text-sm font-medium">Módulo<select value={entity} onChange={(event) => setEntity(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-56 text-sm font-medium">Acción<select value={action} onChange={(event) => setAction(event.target.value)} className="ui-field mt-1 block"><option value="all">Todas</option>{actions.map((value) => <option key={value} value={value}>{actionLabels[value] ?? value}</option>)}</select></label>
      </>}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="Aún no hay eventos de auditoría para esta empresa."
    />
  </>;
}
