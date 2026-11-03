"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { DataTable } from "@/components/tables/data-table";
import { Dialog } from "@/components/dialogs/dialog";
import { Button } from "@/components/ui/button";
import type { CalendarEventRow } from "./calendar-panel";

const HOUR_HEIGHT = 56;
const statusLabels: Record<string, string> = { pending: "Pendiente de sincronización", synced: "Sincronizado", error: "Error de sincronización", cancelled: "Cancelado" };
const statusClasses: Record<string, string> = { pending: "bg-warning", synced: "bg-success", error: "bg-danger", cancelled: "bg-danger" };

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function zonedDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function zonedClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { hour: Number(values.hour), minute: Number(values.minute) };
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value));
}

function formatAgendaTime(event: CalendarEventRow) {
  if (!event.allDay) return `${formatLongDate(event.startsAt)} – ${formatTime(event.endsAt)}`;
  const lastIncludedDay = new Date(new Date(event.endsAt).getTime() - 1);
  const startLabel = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Lima" }).format(new Date(event.startsAt));
  const endLabel = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "America/Lima" }).format(lastIncludedDay);
  return dateKey(new Date(event.startsAt)) === dateKey(lastIncludedDay) ? `${startLabel} · Todo el día` : `${startLabel} – ${endLabel} · Todo el día`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(date);
}

function participantResponseLabel(status: string) {
  const labels: Record<string, string> = { accepted: "Aceptó", tentative: "Provisional", needsAction: "Sin responder", declined: "Rechazó" };
  return labels[status] ?? status;
}

function eventDot(event: CalendarEventRow) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusClasses[event.syncStatus] ?? "bg-subtle"}`} title={statusLabels[event.syncStatus] ?? event.syncStatus} aria-label={statusLabels[event.syncStatus] ?? event.syncStatus} />;
}

function sourceColor(accountId: string | null) {
  if (!accountId) return null;
  let hash = 0;
  for (let index = 0; index < accountId.length; index += 1) hash = (hash * 31 + accountId.charCodeAt(index)) >>> 0;
  return `hsl(${hash % 360} 70% 48%)`;
}

function sourceLabel(event: CalendarEventRow) {
  return event.sourceAccountLabel || "Gestión MD";
}

function sourceDot(event: CalendarEventRow, className = "h-2 w-2") {
  const color = sourceColor(event.sourceAccountId);
  return <span className={`inline-block shrink-0 rounded-full ${className} ${color ? "" : "bg-subtle"}`} style={color ? { backgroundColor: color } : undefined} title={`Origen: ${sourceLabel(event)}`} aria-label={`Origen: ${sourceLabel(event)}`} />;
}

function eventSourceStyle(event: CalendarEventRow): CSSProperties {
  if (event.syncStatus === "cancelled") return { borderColor: "var(--danger)", backgroundColor: "color-mix(in srgb, var(--danger) 12%, var(--surface))" };
  const color = sourceColor(event.sourceAccountId);
  return color ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface))` } : {};
}

function compareEventVisibility(a: CalendarEventRow, b: CalendarEventRow) {
  const cancelledOrder = Number(a.syncStatus === "cancelled") - Number(b.syncStatus === "cancelled");
  return cancelledOrder || a.startsAt.localeCompare(b.startsAt);
}

function getOverlapGroups(events: CalendarEventRow[]) {
  const sorted = [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || Date.parse(b.endsAt) - Date.parse(a.endsAt));
  const groups: CalendarEventRow[][] = [];
  let group: CalendarEventRow[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;

  for (const event of sorted) {
    const start = Date.parse(event.startsAt);
    const end = Date.parse(event.endsAt);
    if (group.length && start >= groupEnd) {
      groups.push(group);
      group = [];
      groupEnd = Number.NEGATIVE_INFINITY;
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length) groups.push(group);

  return groups.map((items) => [...items].sort((a, b) => {
    const cancelledOrder = Number(a.syncStatus !== "cancelled") - Number(b.syncStatus !== "cancelled");
    return cancelledOrder || (Date.parse(b.endsAt) - Date.parse(b.startsAt)) - (Date.parse(a.endsAt) - Date.parse(a.startsAt));
  }));
}

export function CalendarViews({ events, mode, currentDate, companyName }: { events: CalendarEventRow[]; mode: "agenda" | "week" | "month"; currentDate: Date; companyName: string }) {
  if (mode === "week") return <WeekView events={events} currentDate={currentDate} companyName={companyName} />;
  if (mode === "month") return <MonthView events={events} currentDate={currentDate} />;
  return <AgendaView events={events} companyName={companyName} />;
}

function EventDetailDialog({ selected, companyName, onClose }: { selected: CalendarEventRow | null; companyName: string; onClose: () => void }) {
  return <Dialog title="Detalle del evento" open={selected !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    {selected && <div className="space-y-5 text-sm">
      <div><p className="text-xs uppercase tracking-wide text-subtle">Evento</p><h3 className="mt-1 text-base font-semibold text-ink">{selected.title}</h3></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase tracking-wide text-subtle">Empresa</p><p className="mt-1 text-ink">{selected.companyName || companyName}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Cuenta de origen</p><p className="mt-1 inline-flex items-center gap-2 text-ink">{sourceDot(selected)}<span>{sourceLabel(selected)}</span></p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Estado de sincronización</p><p className="mt-1 inline-flex items-center gap-2 text-ink">{eventDot(selected)}{statusLabels[selected.syncStatus] ?? selected.syncStatus}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Inicio</p><p className="mt-1 text-ink">{selected.allDay ? `${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(new Date(selected.startsAt))} · Todo el día` : formatDateTime(selected.startsAt)}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-subtle">Fin</p><p className="mt-1 text-ink">{selected.allDay ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(new Date(new Date(selected.endsAt).getTime() - 1)) : formatDateTime(selected.endsAt)}</p></div>
      </div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Descripción, contexto y participantes</p><p className="mt-1 whitespace-pre-wrap leading-6 text-ink">{selected.description.trim() || "Este evento no tiene descripción."}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-subtle">Participantes de la invitación</p>{selected.participants.length === 0 ? <p className="mt-1 text-muted">El proveedor no devolvió participantes para este evento.</p> : <ul className="mt-2 space-y-2">{selected.participants.map((participant, index) => <li key={`${participant.email ?? participant.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2"><span className="min-w-0"><span className="block truncate font-medium text-ink">{participant.name || participant.email || "Participante"}{participant.organizer && <span className="ml-2 text-[10px] font-normal text-muted">Organizador</span>}</span>{participant.name && participant.email && <span className="block truncate text-xs text-muted">{participant.email}</span>}</span>{participant.responseStatus && <span className="shrink-0 text-xs text-muted">{participantResponseLabel(participant.responseStatus)}</span>}</li>)}</ul>}</div>
    </div>}
  </Dialog>;
}

function AgendaView({ events, companyName }: { events: CalendarEventRow[]; companyName: string }) {
  const [selected, setSelected] = useState<CalendarEventRow | null>(null);
  return <>
    <DataTable
      className="!text-xs"
      containerClassName="!mt-4"
      rows={events}
      rowKey={(event) => event.id}
      emptyMessage="No hay eventos para mostrar en este calendario."
      sortRows={(items) => [...items].sort(compareEventVisibility)}
      columns={[
        { key: "event", label: "Evento", className: "min-w-56", render: (event) => <span className={`font-medium ${event.syncStatus === "cancelled" ? "text-danger" : "text-ink"}`}>{event.title}</span> },
        { key: "company", label: "Empresa y origen", className: "min-w-48", render: (event) => <span className="block"><span className="block">{event.companyName || companyName}</span><span className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-[10px] text-muted">{sourceDot(event, "h-2.5 w-2.5")}<span className="truncate" title={sourceLabel(event)}>{sourceLabel(event)}</span></span></span> },
        { key: "date", label: "Fecha y hora", className: "min-w-48", render: (event) => formatAgendaTime(event) },
        { key: "sync", label: "Sincronización", className: "min-w-44", render: (event) => <span className="inline-flex items-center gap-2 whitespace-nowrap">{eventDot(event)}{statusLabels[event.syncStatus] ?? event.syncStatus}</span> },
        { key: "detail", label: "Detalle", className: "w-24", render: (event) => <Button type="button" size="compact" variant="secondary" onClick={() => setSelected(event)}>Ver detalle</Button> },
      ]}
    />
    <EventDetailDialog selected={selected} companyName={companyName} onClose={() => setSelected(null)} />
  </>;
}

function WeekView({ events, currentDate, companyName }: { events: CalendarEventRow[]; currentDate: Date; companyName: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<CalendarEventRow | null>(null);
  const [openGroup, setOpenGroup] = useState<{ key: string; events: CalendarEventRow[]; top: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const weekStart = startOfWeek(currentDate);
  const weekKey = dateKey(weekStart);
  const todayKey = zonedDateKey(now);
  const currentClock = zonedClock(now);
  const currentTimeTop = (currentClock.hour * 60 + currentClock.minute) / 60 * HOUR_HEIGHT;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, zonedClock(new Date()).hour * HOUR_HEIGHT - 120);
  }, [weekKey]);
  useEffect(() => {
    const updateTime = () => setNow(new Date());
    let minuteInterval: number | undefined;
    const firstMinute = window.setTimeout(() => {
      updateTime();
      minuteInterval = window.setInterval(updateTime, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(firstMinute);
      if (minuteInterval) window.clearInterval(minuteInterval);
    };
  }, []);
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !popoverRef.current?.contains(event.target)) setOpenGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  return <>
    <section ref={scrollRef} className="mt-4 max-h-[min(68vh,42rem)] overflow-auto rounded-xl border border-line bg-surface">
      <div className="min-w-[980px]">
        <div className="sticky top-0 z-10 grid grid-cols-[3.5rem_repeat(7,minmax(9rem,1fr))] border-b border-line bg-surface/95 backdrop-blur-sm"><div className="border-r border-line p-2" />{days.map((day) => <div key={dateKey(day)} className="border-r border-line px-2 py-2 text-center last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">{new Intl.DateTimeFormat("es-PE", { weekday: "short", timeZone: "America/Lima" }).format(day)}</p><p className={`mt-1 text-sm font-semibold ${dateKey(day) === todayKey ? "text-accent" : "text-ink"}`}>{day.getDate()}</p></div>)}</div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(9rem,1fr))]">
          <div className="border-r border-line">{Array.from({ length: 24 }, (_, hour) => <div key={hour} className="h-14 border-b border-line px-1 pt-1 text-[10px] tabular-nums text-subtle">{String(hour).padStart(2, "0")}:00</div>)}</div>
          {days.map((day) => <div key={dateKey(day)} className="relative border-r border-line last:border-r-0">
            {Array.from({ length: 24 }, (_, hour) => <div key={hour} className="h-14 border-b border-line" />)}
            {dateKey(day) === todayKey && <div aria-label={`Hora actual ${String(currentClock.hour).padStart(2, "0")}:${String(currentClock.minute).padStart(2, "0")}`} className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-danger" style={{ top: `${currentTimeTop}px` }}><span className="absolute -left-1.5 -top-[5px] h-2.5 w-2.5 rounded-full bg-danger" /></div>}
            {getOverlapGroups(events.filter((event) => zonedDateKey(new Date(event.startsAt)) === dateKey(day))).map((group, groupIndex) => {
              const groupKey = `${dateKey(day)}-${group[0].id}-${groupIndex}`;
              const stacked = group.length > 3;
              const visible = stacked ? group.slice(0, 3) : group;
              return <Fragment key={groupKey}>{visible.map((event, stackIndex) => {
                const start = new Date(event.startsAt);
                const end = new Date(event.endsAt);
                const startClock = zonedClock(start);
                const minutes = startClock.hour * 60 + startClock.minute;
                const duration = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                const offset = stackIndex * 24;
                const opensList = stacked;
                const clickEvent = () => {
                  if (opensList) setOpenGroup({ key: groupKey, events: group, top: minutes / 60 * HOUR_HEIGHT + 2 });
                  else setSelected(event);
                };
                return <button key={event.id} type="button" onClick={clickEvent} aria-haspopup="dialog" aria-label={opensList ? `Ver ${group.length} reuniones que coinciden` : `Ver detalle de ${event.title}`} className={`absolute overflow-hidden rounded-md border-l-4 border-y border-r border-line px-1.5 py-1 text-left text-[10px] shadow-sm transition hover:brightness-[0.97] focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-accent ${event.syncStatus === "cancelled" ? "text-danger" : "text-ink"}`} style={{ ...eventSourceStyle(event), left: `calc(4px + ${offset}px)`, right: "4px", zIndex: stackIndex + 1, top: `${minutes / 60 * HOUR_HEIGHT + 2}px`, height: `${Math.max(28, duration / 60 * HOUR_HEIGHT - 4)}px` }} title={`${event.title} · ${sourceLabel(event)} · ${statusLabels[event.syncStatus] ?? event.syncStatus}`}>
                  <p className="flex items-start gap-1 font-semibold">{sourceDot(event, "h-1.5 w-1.5")}<span className="min-w-0 truncate">{event.title}</span></p>
                  <p className="mt-0.5 truncate opacity-80">{event.allDay ? "Todo el día" : `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`}</p>
                </button>;
              })}{stacked && <button type="button" onClick={() => { const start = new Date(group[0].startsAt); setOpenGroup({ key: groupKey, events: group, top: (start.getHours() * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT + 2 }); }} aria-label={`Mostrar las ${group.length} reuniones que coinciden`} className="absolute right-2 z-20 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow-sm hover:border-accent" style={{ top: `${(new Date(group[0].startsAt).getHours() * 60 + new Date(group[0].startsAt).getMinutes()) / 60 * HOUR_HEIGHT + 2}px` }}>+{group.length - visible.length}</button>}</Fragment>;
            })}
            {openGroup && openGroup.key.startsWith(`${dateKey(day)}-`) && <div ref={popoverRef} role="dialog" aria-label="Reuniones que coinciden" className="absolute left-2 z-40 max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-xl" style={{ top: `${openGroup.top}px`, ...(days.indexOf(day) >= 5 ? { left: "auto", right: "8px" } : {}) }}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{openGroup.events.length} reuniones que coinciden</p>
              <div className="space-y-1">{[...openGroup.events].sort(compareEventVisibility).map((event) => <button key={event.id} type="button" onClick={() => { setOpenGroup(null); setSelected(event); }} className={`flex w-full items-start gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-xs transition hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-accent ${event.syncStatus === "cancelled" ? "text-danger" : "text-ink"}`} style={eventSourceStyle(event)}>
                {sourceDot(event, "mt-1 h-2 w-2")}
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{event.title}</span><span className="mt-0.5 block truncate text-[10px] text-muted">{formatTime(event.startsAt)} – {formatTime(event.endsAt)} · {sourceLabel(event)}</span></span>
              </button>)}</div>
            </div>}
          </div>)}
        </div>
      </div>
    </section>
    <EventDetailDialog selected={selected} companyName={companyName} onClose={() => setSelected(null)} />
  </>;
}

function MonthView({ events, currentDate }: { events: CalendarEventRow[]; currentDate: Date }) {
  const monthStart = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const monthLabel = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" }).format(monthStart);
  return <section className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface"><div className="min-w-[760px]"><div className="border-b border-line px-4 py-3 text-sm font-semibold capitalize text-ink">{monthLabel}</div><div className="grid grid-cols-7 border-b border-line">{Array.from({ length: 7 }, (_, index) => <div key={index} className="border-r border-line px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-subtle last:border-r-0">{new Intl.DateTimeFormat("es-PE", { weekday: "short", timeZone: "America/Lima" }).format(addDays(gridStart, index))}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const dayEvents = events.filter((event) => dateKey(new Date(event.startsAt)) === dateKey(day)); const outside = day.getMonth() !== monthStart.getMonth(); return <div key={dateKey(day)} className={`min-h-28 border-b border-r border-line p-2 last:border-r-0 ${outside ? "bg-canvas/50" : "bg-surface"}`}><p className={`text-xs font-semibold ${outside ? "text-subtle" : dateKey(day) === dateKey(new Date()) ? "text-accent" : "text-ink"}`}>{day.getDate()}</p><div className="mt-1 space-y-1">{[...dayEvents].sort(compareEventVisibility).slice(0, 3).map((event) => <div key={event.id} className={`flex min-w-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] ${event.syncStatus === "cancelled" ? "text-danger" : "text-ink"}`} style={eventSourceStyle(event)} title={`${event.title} · ${sourceLabel(event)} · ${statusLabels[event.syncStatus] ?? event.syncStatus}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusClasses[event.syncStatus] ?? "bg-subtle"}`} /><span className="min-w-0 truncate">{event.title}</span></div>)}{dayEvents.length > 3 && <p className="text-[10px] text-muted">+{dayEvents.length - 3} más</p>}</div></div>; })}</div></div></section>;
}
