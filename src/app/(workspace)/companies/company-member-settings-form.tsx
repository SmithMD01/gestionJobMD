
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CompanyMember } from "./company-member-selector";
import { Button } from "@/components/ui/button";

export function CompanyMemberSettingsForm({ companyId, member, onSaved, onPendingChange }: {
  companyId: string;
  member: CompanyMember;
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [visibleInActivityAssignments, setVisibleInActivityAssignments] = useState(member.visibleInActivityAssignments);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    try {
      const response = await fetch(`/api/companies/${companyId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibleInActivityAssignments }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo guardar la configuración.");
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <dl className="grid gap-3 rounded-lg bg-note p-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted">Nombre</dt><dd className="mt-1 font-medium text-ink">{member.name}</dd></div>
        <div><dt className="text-xs text-muted">Correo</dt><dd className="mt-1 break-all font-medium text-ink">{member.email}</dd></div>
        <div><dt className="text-xs text-muted">Rol</dt><dd className="mt-1 font-medium text-ink">{member.role === "admin" ? "Administrador" : "Usuario"}</dd></div>
        <div><dt className="text-xs text-muted">Acceso al sistema</dt><dd className="mt-1 font-medium text-ink">{member.banned ? "Inactivo" : "Activo"}</dd></div>
      </dl>
      <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
        <input type="checkbox" checked={visibleInActivityAssignments} onChange={(event) => setVisibleInActivityAssignments(event.target.checked)} />
        <span><span className="block font-medium text-ink">Visible en asignación de actividades</span><span className="mt-1 block text-xs text-muted">Si está desmarcado, no aparecerá como responsable disponible. Las cuentas inactivas tampoco aparecen, aunque esta opción esté marcada.</span></span>
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button variant="primary" loading={pending}>{pending ? "Guardando…" : "Guardar configuración"}</Button>
    </form>
  );
}
