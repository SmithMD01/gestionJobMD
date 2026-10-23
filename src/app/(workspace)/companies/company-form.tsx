"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CompanyForm({ onCreated, onPendingChange }: { onCreated: () => void; onPendingChange?: (pending: boolean) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ name }),
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
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={pending} aria-busy={pending} className="ui-button ui-button-primary">
        {pending ? "Creando…" : "Crear empresa"}
      </button>
    </form>
  );
}
