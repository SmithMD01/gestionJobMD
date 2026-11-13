"use client";

import { useMemo, useState } from "react";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ModuleHeader } from "../module-layout";

export type EmailDeliveryRow = {
  id: string;
  recipientEmail: string;
  emailType: string;
  provider: string;
  status: string;
  detail: string | null;
  createdAt: string;
};

const statusLabels: Record<string, string> = { accepted: "Aceptado por Graph", error: "Error" };
const emailTypeLabels: Record<string, string> = { password_reset: "Recuperación de contraseña" };
const providerLabels: Record<string, string> = { microsoft_graph: "Microsoft Graph" };

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(date);
}

export function EmailLogsPanel({ companyName, rows }: { companyName: string; rows: EmailDeliveryRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))), [rows]);
  const normalizedSearch = search.trim().toLocaleLowerCase("es-PE");
  const filterKey = `${normalizedSearch}:${status}`;

  const columns: TableColumn<EmailDeliveryRow>[] = [
    { key: "date", label: "Fecha", className: "whitespace-nowrap", render: (row) => <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time> },
    { key: "recipient", label: "Destinatario", className: "min-w-56", render: (row) => <span className="font-medium text-ink">{row.recipientEmail}</span> },
    { key: "type", label: "Tipo de correo", className: "min-w-52", render: (row) => emailTypeLabels[row.emailType] ?? row.emailType },
    { key: "provider", label: "Proveedor", className: "whitespace-nowrap", render: (row) => providerLabels[row.provider] ?? row.provider },
    { key: "status", label: "Estado", className: "whitespace-nowrap", render: (row) => <span className={`font-medium ${row.status === "accepted" ? "text-success" : "text-danger"}`}>{statusLabels[row.status] ?? row.status}</span> },
    { key: "detail", label: "Detalle", className: "min-w-64", render: (row) => row.detail ? <span className={row.status === "error" ? "text-danger" : "text-muted"}>{row.detail}</span> : <span className="text-muted">—</span> },
  ];

  return <>
    <ModuleHeader title="Seguimiento de correos" description={`${companyName} · Revisa los envíos de recuperación de contraseña y sus errores.`} />
    <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">“Aceptado por Graph” significa que Microsoft Graph aceptó la solicitud; no confirma que el mensaje haya llegado a la bandeja del destinatario.</p>
    <DataTable
      className="!text-xs"
      rows={rows}
      filterKey={filterKey}
      filterRow={(row) => {
        const matchesStatus = status === "all" || row.status === status;
        const searchable = `${row.recipientEmail} ${emailTypeLabels[row.emailType] ?? row.emailType} ${row.detail ?? ""}`.toLocaleLowerCase("es-PE");
        return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
      }}
      toolbar={<>
        <label className="min-w-64 flex-1 text-xs font-medium">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Destinatario o detalle" className="ui-field mt-1 block" /></label>
        <label className="min-w-44 text-xs font-medium">Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos</option>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value] ?? value}</option>)}</select></label>
      </>}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No hay intentos de envío de correo para esta empresa."
    />
  </>;
}
