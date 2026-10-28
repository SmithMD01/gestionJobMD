"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { UiIcon } from "../ui-icon";
import type { WorkspaceNotification } from "@/modules/notifications/types";
import { Button } from "@/components/ui/button";

function notificationTone(notification: WorkspaceNotification) {
  if (notification.daysRemaining !== null && notification.daysRemaining < 0) return { dot: "bg-danger", text: "text-danger" };
  return { dot: "bg-warning", text: "text-warning" };
}

function notificationBadgeClass(items: WorkspaceNotification[]) {
  if (items.some((notification) => notification.daysRemaining !== null && notification.daysRemaining < 0)) return "bg-danger";
  return "bg-warning";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function daysLabel(days: number | null) {
  if (days === null) return "Sin fecha límite";
  if (days < 0) return `Vencida hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "Vence hoy";
  return `Faltan ${days} ${days === 1 ? "día" : "días"}`;
}

const sourceLabels: Record<WorkspaceNotification["source"], string> = { activities: "Actividades", development: "Desarrollo", gantt: "Gantt" };

function NotificationItem({ notification, onNavigate }: { notification: WorkspaceNotification; onNavigate: () => void }) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasDescription = Boolean(notification.description?.trim());
  const tone = notificationTone(notification);

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  function startLongPress(event: PointerEvent<HTMLAnchorElement>) {
    if (!hasDescription || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
    pressTimer.current = setTimeout(() => setDescriptionOpen(true), 2000);
  }

  function endLongPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setDescriptionOpen(false);
  }

  return (
    <li className="relative">
      <Link
        href={notification.href}
        onPointerDown={startLongPress}
        onPointerUp={endLongPress}
        onPointerCancel={endLongPress}
        onPointerLeave={endLongPress}
        onClick={onNavigate}
        className="group relative block rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-line hover:bg-hover focus-visible:border-accent focus-visible:outline-none"
      >
        <span className="flex gap-2">
          <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${tone.dot}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-ink" title={notification.entityName}>{notification.entityName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-muted" title={notification.projectName}>Proyecto: {notification.projectName}</span>
            <span className="mt-1 inline-flex rounded border border-line bg-canvas px-1.5 py-0.5 text-[9px] font-medium text-muted">{sourceLabels[notification.source]}</span>
            <span className="mt-1 block truncate text-[10px] text-subtle">{notification.title}{notification.priority !== null ? ` · P${notification.priority}` : ""}</span>
            <span className={`mt-1 block truncate text-[11px] font-medium ${tone.text}`}>
              {notification.date ? `${formatDate(notification.date)} · ${daysLabel(notification.daysRemaining)}` : daysLabel(notification.daysRemaining)}
            </span>
          </span>
        </span>
        {hasDescription && <span role="tooltip" className={`pointer-events-none absolute left-2 right-2 top-full z-30 mt-1 rounded-lg border border-line bg-ink px-3 py-2 text-left text-xs font-normal leading-5 text-on-primary shadow-lg transition-opacity ${descriptionOpen ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"}`}>{notification.description}</span>}
      </Link>
    </li>
  );
}

export function NotificationBell({ notifications }: { notifications: WorkspaceNotification[] }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<"activities" | "gantt">("activities");
  const activityNotifications = notifications.filter((notification) => notification.kind !== "schedule");
  const ganttNotifications = notifications.filter((notification) => notification.kind === "schedule");

  function renderSection(items: WorkspaceNotification[], emptyMessage: string) {
    return items.length === 0 ? <p className="mt-3 text-xs text-muted">{emptyMessage}</p> : <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">{items.map((notification) => <NotificationItem key={notification.id} notification={notification} onNavigate={() => setOpen(false)} />)}</ul>;
  }

  return (
    <div className="relative">
      <Button type="button" variant="secondary" size="icon" onClick={() => setOpen((value) => !value)} aria-label={notifications.length ? `${notifications.length} notificaciones` : "Notificaciones"} aria-expanded={open} aria-controls="notification-panel" className="relative rounded-xl text-muted">
        <UiIcon name="bell" />
        {notifications.length > 0 && <span aria-hidden="true" className={`absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full ${notificationBadgeClass(notifications)} px-1 text-[9px] font-bold leading-4 text-on-primary`}>{notifications.length > 99 ? "99+" : notifications.length}</span>}
      </Button>
      {open && <div id="notification-panel" className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 text-sm shadow-lg">
        <div className="flex items-center justify-between gap-2"><p className="font-semibold text-ink">Notificaciones</p>{notifications.length > 0 && <span className="text-[11px] text-subtle">{notifications.length} pendientes</span>}</div>
        <div className="mt-3 flex rounded-lg border border-line p-1" role="group" aria-label="Sección de notificaciones">
          <Button type="button" variant={section === "activities" ? "primary" : "ghost"} size="compact" aria-pressed={section === "activities"} aria-controls="notification-activities" onClick={() => setSection("activities")} className="flex-1 justify-between gap-2">Actividades{activityNotifications.length > 0 && <span className={`rounded-full ${notificationBadgeClass(activityNotifications)} px-1.5 text-[10px] leading-4 text-on-primary`}>{activityNotifications.length > 99 ? "99+" : activityNotifications.length}</span>}</Button>
          <Button type="button" variant={section === "gantt" ? "primary" : "ghost"} size="compact" aria-pressed={section === "gantt"} aria-controls="notification-gantt" onClick={() => setSection("gantt")} className="flex-1 justify-between gap-2">Gantt{ganttNotifications.length > 0 && <span className={`rounded-full ${notificationBadgeClass(ganttNotifications)} px-1.5 text-[10px] leading-4 text-on-primary`}>{ganttNotifications.length > 99 ? "99+" : ganttNotifications.length}</span>}</Button>
        </div>
        <div id="notification-activities" role="tabpanel" hidden={section !== "activities"}>
          {renderSection(activityNotifications, "No hay alertas de actividades.")}
        </div>
        <div id="notification-gantt" role="tabpanel" hidden={section !== "gantt"}>
          {renderSection(ganttNotifications, "No hay avisos de etapas del Gantt.")}
        </div>
      </div>}
    </div>
  );
}
