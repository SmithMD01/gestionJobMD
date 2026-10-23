"use client";

import { useState } from "react";
import { UiIcon } from "../ui-icon";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Notificaciones" aria-expanded={open} aria-controls="notification-panel" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted shadow-sm hover:bg-hover hover:text-ink">
        <UiIcon name="bell" />
      </button>
      {open && <div id="notification-panel" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-surface p-4 text-sm shadow-lg">
        <p className="font-semibold text-ink">Notificaciones</p>
        <p className="mt-2 text-muted">No tienes notificaciones.</p>
      </div>}
    </div>
  );
}
