import type { ReactNode } from "react";
import { Dialog } from "@/components/dialogs/dialog";
import { Button } from "@/components/ui/button";

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
    trigger={showTrigger ? <Button type="button" variant="primary" onClick={() => onOpenChange(true)}>{triggerLabel}</Button> : undefined}
  >{children}</Dialog>;
}
