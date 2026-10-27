"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

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
            <button type="button" onClick={close} disabled={busy} aria-label={closeLabel} className="ui-button ui-button-secondary !min-h-8 !px-2">{closeLabel}</button>
          </div>
          {open && children}
        </div>
      </dialog>
    </>
  );
}
