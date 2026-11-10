"use client";

import { useMemo, useState } from "react";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ModuleHeader } from "../module-layout";

export type CalendarSyncMonitorRow = { id: string; userId: string; userName: string; companyName: string; accountLabel: string; accountEmail: string; provider: string; trigger: string; status: string; apiRequests: number; fetchedEvents: number; removedEvents: number; errorMessage: string | null; startedAt: string; finishedAt: string | null };

const statusLabels: Record<string, string> = { success: "Correcta", partial: "Parcial", error: "Error", running: "En curso" };
const triggerLabels: Record<string, string> = { automatic: "Automática", manual: "Manual" };
const providerLabels: Record<string, string> = { google: "Google", microsoft: "Outlook" };
const GOOGLE_DAILY_REQUEST_THRESHOLD = 1_000_000;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(date);
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p><p className="mt-1 text-[11px] text-subtle">{hint}</p></div>;
}

export function CalendarMonitorPanel({ rows, googleRequestsToday, microsoftRequestsToday, executionsToday, errorsToday, lastAutomaticRun }: { rows: CalendarSyncMonitorRow[]; googleRequestsToday: number; microsoftRequestsToday: number; executionsToday: number; errorsToday: number; lastAutomaticRun: string | null }) {
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [provider, setProvider] = useState("all");
  const providerOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.provider))), [rows]);
  const quotaPercent = googleRequestsToday / GOOGLE_DAILY_REQUEST_THRESHOLD * 100;
  const quotaColor = quotaPercent >= 95 ? "bg-danger" : quotaPercent >= 80 ? "bg-warning" : "bg-accent";
  const columns: TableColumn<CalendarSyncMonitorRow>[] = [
    { key: "started", label: "Inicio", className: "whitespace-nowrap", render: (row) => <time dateTime={row.startedAt}>{formatDate(row.startedAt)}</time> },
    { key: "account", label: "Cuenta origen", className: "min-w-52", render: (row) => <span className="block"><span className="block font-medium text-ink">{row.accountLabel}</span><span className="block text-[10px] text-muted">{row.accountEmail}</span></span> },
    { key: "provider", label: "Proveedor", className: "whitespace-nowrap", render: (row) => providerLabels[row.provider] ?? row.provider },
    { key: "user", label: "Usuario", render: (row) => row.userName },
    { key: "company", label: "Empresa", render: (row) => row.companyName },
    { key: "trigger", label: "Origen", render: (row) => triggerLabels[row.trigger] ?? row.trigger },
    { key: "status", label: "Resultado", render: (row) => <span className={row.status === "success" ? "font-medium text-success" : row.status === "running" ? "font-medium text-warning" : "font-medium text-danger"}>{statusLabels[row.status] ?? row.status}</span> },
    { key: "requests", label: "Consultas API", className: "text-right tabular-nums", render: (row) => row.apiRequests },
    { key: "events", label: "Eventos recibidos", className: "text-right tabular-nums", render: (row) => row.fetchedEvents },
    { key: "error", label: "Detalle", className: "min-w-48", render: (row) => row.errorMessage ? <span className="block max-w-xs truncate text-danger" title={row.errorMessage}>{row.errorMessage}</span> : <span className="text-muted">—</span> },
  ];

  return <>
    <ModuleHeader title="Consumo de calendario" description="Una consulta API es una llamada HTTP a Google Calendar o Microsoft Graph para leer eventos; no es una reunión ni un evento individual. Cada consulta trae una página de resultados y puede haber varias si hay más páginas. Una sincronización centralizada consulta varias cuentas y genera un registro por cuenta." />
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      <div className="rounded-xl border border-line bg-surface p-4" title="Se cuentan las llamadas de consulta a Google Calendar, no los eventos ni las reuniones.">
        <p className="text-xs text-muted">Consultas de Google Calendar hoy</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{googleRequestsToday.toLocaleString("es-PE")} <span className="text-xs font-normal text-muted">/ {GOOGLE_DAILY_REQUEST_THRESHOLD.toLocaleString("es-PE")}</span></p>
        <div role="progressbar" aria-label="Uso del umbral diario de referencia de Google Calendar" aria-valuemin={0} aria-valuemax={GOOGLE_DAILY_REQUEST_THRESHOLD} aria-valuenow={Math.min(googleRequestsToday, GOOGLE_DAILY_REQUEST_THRESHOLD)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover"><span className={`block h-full rounded-full ${quotaColor}`} style={{ width: `${Math.min(100, quotaPercent)}%` }} /></div>
        <p className="mt-1 text-[10px] tabular-nums text-muted">{quotaPercent.toFixed(3)}% del umbral publicado</p>
        <p className="mt-1 text-[11px] text-subtle">Incluye sincronizaciones manuales y automáticas. Referencia: 1,000,000 consultas/día por proyecto Google; revisa la cuota real en Google Cloud.</p>
      </div>
      <StatCard label="Consultas de Outlook hoy" value={microsoftRequestsToday.toLocaleString("es-PE")} hint="Llamadas a Microsoft Graph. Incluye sincronizaciones manuales y automáticas." />
      <StatCard label="Cuentas procesadas hoy" value={executionsToday} hint="Es el número de registros por cuenta, no los clics en sincronizar." />
      <StatCard label="Cuentas con incidencias" value={errorsToday} hint="Registros con error o resultado parcial hoy." />
      <StatCard label="Última automática" value={lastAutomaticRun ? formatDate(lastAutomaticRun) : "—"} hint="Se intenta cada 20 min con el espacio abierto; no es tiempo real." />
    </div>
    <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">La consulta automática se activa al entrar al espacio de trabajo y vuelve a intentarlo cada 20 minutos mientras la sesión siga abierta. Al sincronizar manualmente se consulta el rango configurado y se actualizan los mismos eventos existentes; no se crea una reunión nueva por cada llamada.</p>
    <DataTable
      className="!text-xs"
      rows={rows}
      filterKey={`${status}:${trigger}:${provider}`}
      filterRow={(row) => (status === "all" || row.status === status) && (trigger === "all" || row.trigger === trigger) && (provider === "all" || row.provider === provider)}
      toolbar={<>
        <label className="min-w-40 text-xs font-medium">Resultado<select value={status} onChange={(event) => setStatus(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-40 text-xs font-medium">Origen<select value={trigger} onChange={(event) => setTrigger(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos</option>{Object.entries(triggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-40 text-xs font-medium">Proveedor<select value={provider} onChange={(event) => setProvider(event.target.value)} className="ui-field mt-1 block"><option value="all">Todos</option>{providerOptions.map((value) => <option key={value} value={value}>{providerLabels[value] ?? value}</option>)}</select></label>
      </>}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No hay sincronizaciones registradas en los últimos 30 días."
    />
    <p className="mt-3 text-[11px] text-muted">La columna “Consultas API” cuenta las páginas de eventos solicitadas al proveedor indicado. El número de cuentas procesadas no equivale al número de clics: una acción centralizada puede generar un registro por cada cuenta consultada. Los eventos individuales y los tokens OAuth no se cuentan como consultas.</p>
  </>;
}
