"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Dialog({
  title,
  open,
  onOpenChange,
  children,
  trigger,
  busy = false,
  closeLabel = "Cerrar",
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  trigger?: ReactNode;
  busy?: boolean;
  closeLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (!busy) onOpenChange(false);
  }

  return (
    <>
      {trigger}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => onOpenChange(false)}
        onCancel={(event) => { if (busy) event.preventDefault(); }}
        onClick={(event) => { if (event.target === dialogRef.current) close(); }}
        className="ui-dialog"
      >
        <div className="ui-dialog-content">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-semibold text-ink">{title}</h2>
            <Button type="button" variant="secondary" size="compact" onClick={close} disabled={busy} aria-label={closeLabel}>{closeLabel}</Button>
          </div>
          {open && children}
        </div>
      </dialog>
    </>
  );
}
