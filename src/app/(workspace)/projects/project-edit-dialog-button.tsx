"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateDialog } from "../create-dialog";
import { ProjectForm, type ProjectFormProject } from "./project-form";

export function ProjectEditDialogButton({ project }: { project: ProjectFormProject }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <CreateDialog title="Editar proyecto" triggerLabel="Editar" open={open} onOpenChange={setOpen} busy={pending}>
      <ProjectForm
        key={project.id}
        initial={project}
        embedded
        onPendingChange={setPending}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </CreateDialog>
  );
}
