"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CompanyMemberSelector, type AssignableUser } from "./company-member-selector";

export function CompanyEditForm({ companyId, initialName, initialActive, initialMemberIds, users, currentUserId, onSaved, onPendingChange }: {
  companyId: string;
  initialName: string;
  initialActive: boolean;
  initialMemberIds: string[];
  users: AssignableUser[];
  currentUserId: string;
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [memberIds, setMemberIds] = useState(() => [...new Set([...initialMemberIds, currentUserId])]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const isActive = formData.get("isActive") === "true";
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, isActive, memberIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo actualizar la empresa.");
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

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium">Nombre de la empresa
      <input name="name" defaultValue={initialName} required maxLength={120} className="ui-field mt-1 block" />
    </label>
    <label className="block text-sm font-medium">Estado
      <select name="isActive" defaultValue={initialActive ? "true" : "false"} className="ui-field mt-1 block">
        <option value="true">Activa</option><option value="false">Inactiva</option>
      </select>
      <span className="mt-1 block text-xs text-muted">Las empresas inactivas no aparecen en el selector de empresas.</span>
    </label>
    <CompanyMemberSelector users={users} selectedIds={memberIds} currentUserId={currentUserId} onChange={setMemberIds} />
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={pending} aria-busy={pending} className="ui-button ui-button-primary">
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  </form>;
}
