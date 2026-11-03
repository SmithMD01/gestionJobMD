"use client";

import { useState, type FormEvent } from "react";
import { CreateDialog } from "../create-dialog";
import { ModuleHeader } from "../module-layout";
import { Button, ButtonLink } from "@/components/ui/button";
import { UiIcon } from "../../ui-icon";
import { CalendarViews } from "./calendar-views";
import type { CalendarParticipant } from "@/modules/calendar/participants";

export type CalendarEventRow = { id: string; companyId: string; companyName: string; sourceAccountId: string | null; sourceAccountLabel: string | null; title: string; description: string; participants: CalendarParticipant[]; startsAt: string; endsAt: string; timezone: string; allDay: boolean; syncStatus: string };
type CalendarSyncSummary = { id: string; status: string; windowStart: string; windowEnd: string; apiRequests: number; fetchedEvents: number; removedEvents: number; errorMessage: string | null; startedAt: string; finishedAt: string | null; accountCount?: number; companyCount?: number };

function toIso(value: string) {
  return new Date(value).toISOString();
}

export function CalendarPanel({ companyId, companyName, initialEvents, centralizedEnabled, sourceAccountLabel, sourceAccountConnected, initialLastSync, initialDailyApiRequests }: { companyId: string; companyName: string; initialEvents: CalendarEventRow[]; centralizedEnabled: boolean; sourceAccountLabel: string | null; sourceAccountConnected: boolean; initialLastSync: CalendarSyncSummary | null; initialDailyApiRequests: number }) {
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<"company" | "centralized">("company");
  const [displayMode, setDisplayMode] = useState<"agenda" | "week" | "month">("agenda");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const lastSync = initialLastSync;
  const dailyApiRequests = initialDailyApiRequests;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function changeView(next: "company" | "centralized") {
    setView(next);
    if (next === "company") {
      setEvents(initialEvents);
      return;
    }
    const response = await fetch(`/api/calendar/events?companyId=${encodeURIComponent(companyId)}&view=centralized`);
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setIsError(true);
      setMessage(result?.error ?? "No se pudo cargar el calendario centralizado.");
      setView("company");
      return;
    }
    setEvents(result.events ?? []);
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/calendar/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, title, description, startsAt: toIso(startsAt), endsAt: toIso(endsAt) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.event) {
        setIsError(true);
        setMessage(result?.error ?? "No se pudo crear el evento.");
        return;
      }
      const created: CalendarEventRow = { ...result.event, sourceAccountId: result.event.sourceAccountId ?? null, sourceAccountLabel: null, participants: [], companyName, startsAt: new Date(result.event.startsAt).toISOString(), endsAt: new Date(result.event.endsAt).toISOString() };
      setEvents((current) => [...current, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setCreateOpen(false);
      setIsError(false);
      setMessage("Evento creado en el calendario del sistema.");
    } catch {
      setIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  function formatSyncDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(date);
  }

  function shiftPeriod(amount: number) {
    setCurrentDate((current) => {
      const next = new Date(current);
      if (displayMode === "month") next.setMonth(next.getMonth() + amount);
      else if (displayMode === "week") next.setDate(next.getDate() + amount * 7);
      else next.setDate(next.getDate() + amount);
      return next;
    });
  }

  function periodLabel() {
    if (displayMode === "agenda") return "Todos los eventos";
    if (displayMode === "month") return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(currentDate);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 6);
    return `${new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(currentDate)} – ${new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(end)}`;
  }

  return (
    <section className="mt-8">
      <ModuleHeader title="Calendario" description={view === "company" ? `Eventos propios de ${companyName}.` : "Vista informativa de todos tus eventos centralizados."} action={<CreateDialog title="Nuevo evento" triggerLabel="Nuevo evento" open={createOpen} onOpenChange={setCreateOpen} busy={pending}>
        <form onSubmit={createEvent} className="space-y-4">
          <label className="block text-sm font-medium">Título
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} className="ui-field mt-1 block" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Inicio
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required className="ui-field mt-1 block" />
          </label><label className="block text-sm font-medium">Fin
            <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required className="ui-field mt-1 block" />
          </label></div>
          <label className="block text-sm font-medium">Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} className="ui-field mt-1 block" placeholder="Contexto y participantes como información descriptiva." />
          </label>
          <p className="text-xs text-muted">Este evento se guarda en el sistema. La conexión actual solo lee Google Calendar; no crea ni modifica eventos en Google.</p>
          <Button variant="primary" loading={pending}>{pending ? "Guardando…" : "Crear evento"}</Button>
        </form>
      </CreateDialog>} />

      {message && <p role={isError ? "alert" : "status"} className={`mt-4 text-sm ${isError ? "text-danger" : "text-success"}`}>{message}</p>}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
        <div><p className="text-sm font-semibold text-ink">{view === "company" ? "Calendario de empresa" : "Calendario centralizado"}</p><p className="mt-0.5 text-xs text-muted">Los eventos pertenecen únicamente a tu usuario.</p></div>
        <div className="flex flex-wrap items-center gap-2"><Button type="button" variant={view === "company" ? "primary" : "secondary"} size="compact" onClick={() => void changeView("company")}>Empresa</Button>{centralizedEnabled && <Button type="button" variant={view === "centralized" ? "primary" : "secondary"} size="compact" onClick={() => void changeView("centralized")}><UiIcon name="star" className="h-3.5 w-3.5" />Centralizado</Button>}{view === "company" && !sourceAccountConnected && <ButtonLink href="/profile/calendar" variant="secondary" size="compact">Configurar cuenta origen</ButtonLink>}</div>
      </div>

      {view === "company" && sourceAccountConnected && <section className="mt-3 grid gap-3 rounded-xl border border-line bg-surface p-4 text-xs sm:grid-cols-3">
        <div><p className="text-muted">Cuenta origen</p><p className="mt-1 truncate font-medium text-ink" title={sourceAccountLabel ?? undefined}>{sourceAccountLabel ?? "Google Calendar"}</p><p className="mt-1 text-muted">Ventana: un mes antes y después de hoy</p>{lastSync && <p className="mt-1 text-muted">{formatSyncDate(lastSync.windowStart)} — {formatSyncDate(lastSync.windowEnd)}</p>}</div>
        <div><p className="text-muted">Última sincronización</p><p className="mt-1 font-medium text-ink">{lastSync ? formatSyncDate(lastSync.startedAt) : "Aún no sincronizado"}</p>{lastSync && <p className={lastSync.status === "success" ? "mt-1 text-success" : "mt-1 text-danger"}>{lastSync.status === "success" ? `${lastSync.fetchedEvents} eventos · ${lastSync.apiRequests} solicitudes` : lastSync.errorMessage ?? "Error"}</p>}</div>
        <div><p className="text-muted">Solicitudes de Calendar API hoy</p><p className="mt-1 text-base font-semibold tabular-nums text-ink">{dailyApiRequests}</p><p className="mt-1 text-muted">Contador de esta aplicación para tu usuario; Google Cloud muestra el total del proyecto.</p></div>
      </section>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1"><Button type="button" variant={displayMode === "agenda" ? "primary" : "secondary"} size="compact" onClick={() => setDisplayMode("agenda")}>Agenda</Button><Button type="button" variant={displayMode === "week" ? "primary" : "secondary"} size="compact" onClick={() => setDisplayMode("week")}>Semana</Button><Button type="button" variant={displayMode === "month" ? "primary" : "secondary"} size="compact" onClick={() => setDisplayMode("month")}>Mes</Button></div>{displayMode !== "agenda" && <div className="flex items-center gap-2"><Button type="button" variant="secondary" size="compact" onClick={() => shiftPeriod(-1)} aria-label="Periodo anterior">Anterior</Button><Button type="button" variant="secondary" size="compact" onClick={() => setCurrentDate(new Date())}>Hoy</Button><Button type="button" variant="secondary" size="compact" onClick={() => shiftPeriod(1)} aria-label="Periodo siguiente">Siguiente</Button><span className="min-w-32 text-right text-xs font-medium capitalize text-muted">{periodLabel()}</span></div>}</div>
      <CalendarViews events={events} mode={displayMode} currentDate={currentDate} companyName={companyName} />
    </section>
  );
}
