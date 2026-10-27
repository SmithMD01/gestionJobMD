"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { projectStatusLabel, type ProjectStatus } from "@/modules/projects/constants";
import { Button } from "@/components/ui/button";

export type ProjectFormProject = {
  id: string;
  name: string;
  objective: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
};

export function ProjectForm({ initial, embedded = false, onPendingChange, onSaved }: { initial?: ProjectFormProject; embedded?: boolean; onPendingChange?: (pending: boolean) => void; onSaved?: (project: ProjectFormProject) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      objective: String(form.get("objective") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      status: String(form.get("status") ?? "planned"),
      startDate: String(form.get("startDate") || "") || null,
      endDate: String(form.get("endDate") || "") || null,
    };

    try {
      const response = await fetch(initial ? `/api/projects/${initial.id}` : "/api/projects", {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo guardar el proyecto.");
        return;
      }
      if (onSaved) onSaved(result.project as ProjectFormProject);
      else router.push(`/projects/${result.project.id}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <form onSubmit={submit} className={embedded ? "space-y-5" : "mt-8 space-y-5 rounded-xl border border-line bg-surface p-6"}>
      <label className="block text-sm font-medium">Nombre
        <input name="name" defaultValue={initial?.name} required maxLength={120} className="ui-field mt-1 block" />
      </label>
      <label className="block text-sm font-medium">Objetivo
        <textarea name="objective" defaultValue={initial?.objective} required maxLength={500} rows={3} className="ui-field mt-1 block" />
      </label>
      <label className="block text-sm font-medium">Descripción
        <textarea name="description" defaultValue={initial?.description} maxLength={5000} rows={5} className="ui-field mt-1 block" />
      </label>
      <label className="block text-sm font-medium">Estado
        <select name="status" defaultValue={initial?.status ?? "planned"} className="ui-field mt-1 block">
          {(Object.entries(projectStatusLabel) as [ProjectStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Fecha de inicio
          <input name="startDate" type="date" defaultValue={initial?.startDate ?? ""} className="ui-field mt-1 block" />
        </label>
        <label className="block text-sm font-medium">Fecha de fin prevista
          <input name="endDate" type="date" defaultValue={initial?.endDate ?? ""} className="ui-field mt-1 block" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button variant="primary" loading={pending}>
        {pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear proyecto"}
      </Button>
    </form>
  );
}
