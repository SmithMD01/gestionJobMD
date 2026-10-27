import type { ReactNode } from "react";
import { Dialog } from "@/components/dialogs/dialog";

export function CreateDialog({ title, triggerLabel, open, onOpenChange, busy = false, showTrigger = true, children }: {
  title: string;
  triggerLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  showTrigger?: boolean;
  children: ReactNode;
}) {
  return <Dialog
    title={title}
    open={open}
    onOpenChange={onOpenChange}
    busy={busy}
    trigger={showTrigger ? <button type="button" onClick={() => onOpenChange(true)} className="ui-button ui-button-primary">{triggerLabel}</button> : undefined}
  >{children}</Dialog>;
}
