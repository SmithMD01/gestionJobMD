"use client";

import { useState } from "react";
import Link from "next/link";
import { UiIcon } from "../ui-icon";
import type { WorkspaceNotification } from "@/modules/notifications/types";
import { Button } from "@/components/ui/button";

const toneClass: Record<WorkspaceNotification["kind"], string> = { overdue: "bg-danger", urgent: "bg-danger", schedule: "bg-warning", upcoming: "bg-success" };

export function NotificationBell({ notifications }: { notifications: WorkspaceNotification[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button type="button" variant="secondary" size="icon" onClick={() => setOpen((value) => !value)} aria-label={notifications.length ? `${notifications.length} notificaciones` : "Notificaciones"} aria-expanded={open} aria-controls="notification-panel" className="relative rounded-xl text-muted">
        <UiIcon name="bell" />
        {notifications.length > 0 && <span aria-hidden="true" className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-4 text-on-primary">{notifications.length > 99 ? "99+" : notifications.length}</span>}
      </Button>
      {open && <div id="notification-panel" className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 text-sm shadow-lg">
        <div className="flex items-center justify-between gap-2"><p className="font-semibold text-ink">Notificaciones</p>{notifications.length > 0 && <span className="text-[11px] text-subtle">{notifications.length} pendientes</span>}</div>
        {notifications.length === 0 ? <p className="mt-2 text-xs text-muted">No tienes notificaciones.</p> : <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {notifications.map((notification) => <li key={notification.id}><Link href={notification.href} onClick={() => setOpen(false)} className="flex gap-2 rounded-lg px-2 py-2 text-left hover:bg-hover"><span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${toneClass[notification.kind]}`} /><span className="min-w-0"><span className="block text-xs font-semibold text-ink">{notification.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted" title={notification.detail}>{notification.detail}</span></span></Link></li>)}
        </ul>}
      </div>}
    </div>
  );
}
