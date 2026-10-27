"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CompanyMemberSelector, type AssignableUser } from "./company-member-selector";
import { Button } from "@/components/ui/button";

export function CompanyForm({ users, currentUserId, onCreated, onPendingChange }: { users: AssignableUser[]; currentUserId: string; onCreated: () => void; onPendingChange?: (pending: boolean) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [memberIds, setMemberIds] = useState([currentUserId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, memberIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo crear la empresa.");
        return;
      }
      onCreated();
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
      <label className="block text-sm font-medium">Nombre de la empresa
        <input name="name" required maxLength={120} className="ui-field mt-1 block" />
      </label>
      <CompanyMemberSelector users={users} selectedIds={memberIds} currentUserId={currentUserId} onChange={setMemberIds} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button variant="primary" loading={pending}>
        {pending ? "Creando…" : "Crear empresa"}
    </Button>
    </form>
  );
}
