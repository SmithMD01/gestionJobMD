"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function ViewDetailsDialog({ title, open, onOpenChange, children }: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onClose={() => onOpenChange(false)} onClick={(event) => { if (event.target === dialogRef.current) onOpenChange(false); }} className="ui-dialog">
      <div className="ui-dialog-content">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold text-ink">{title}</h2>
          <button type="button" onClick={() => onOpenChange(false)} className="ui-button ui-button-secondary !min-h-8 !px-2">Cerrar</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
