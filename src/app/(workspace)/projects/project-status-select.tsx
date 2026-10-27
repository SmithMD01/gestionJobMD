"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectStatusLabel, type ProjectStatus } from "@/modules/projects/constants";

const statusDot: Record<ProjectStatus, string> = {
  planned: "bg-neutral-400",
  active: "bg-sky-500",
  paused: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
};

type ProjectData = {
  id: string;
  name: string;
  objective: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
};

export function ProjectStatusSelect({ project }: { project: ProjectData }) {
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: ProjectStatus) {
    if (nextStatus === status) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...project, status: nextStatus }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "No se pudo actualizar el estado.");
        return;
      }
      setStatus(nextStatus);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <label className="flex min-h-8 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-ink focus-within:outline-2 focus-within:outline-accent">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot[status]}`} aria-hidden="true" />
        <span className="sr-only">Estado del proyecto</span>
        <select value={status} disabled={pending} onChange={(event) => void updateStatus(event.target.value as ProjectStatus)} aria-busy={pending} className="max-w-36 cursor-pointer bg-transparent font-medium focus:outline-none disabled:cursor-wait">
          {Object.entries(projectStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-1 max-w-52 text-xs text-danger">{error}</p>}
    </div>
  );
}
