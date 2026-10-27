import type { ReactNode } from "react";
import { Dialog } from "@/components/dialogs/dialog";

export function ViewDetailsDialog({ title, open, onOpenChange, children }: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return <Dialog title={title} open={open} onOpenChange={onOpenChange}>{children}</Dialog>;
}
