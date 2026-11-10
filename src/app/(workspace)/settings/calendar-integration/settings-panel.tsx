"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CalendarSyncMode } from "@/modules/calendar/instance-config";

export function CalendarIntegrationSettings({ initialSyncMode }: { initialSyncMode: CalendarSyncMode }) {
  const router = useRouter();
  const [syncMode, setSyncMode] = useState<CalendarSyncMode>(initialSyncMode);
  const [savedMode, setSavedMode] = useState(initialSyncMode);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);

  async function save() {
    if (saving || syncMode === savedMode) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/settings/calendar-integration", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ syncMode }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No se pudo guardar la configuración.");
      setSavedMode(result.syncMode);
      setError(false);
      setNotice(result.syncMode === "origin"
        ? "Modo Origen activado. Esta instalación puede conectar y sincronizar cuentas de Google y Outlook."
        : "Consultas a proveedores desactivadas. Esta instalación no iniciará sincronizaciones automáticas ni manuales.");
      router.refresh();
    } catch (cause) {
      setError(true);
      setNotice(cause instanceof Error ? cause.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-6 rounded-xl border border-line bg-surface p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="text-sm font-semibold text-ink">Modo de esta instalación</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Define qué servidores pueden consultar a los proveedores. Para evitar llamadas duplicadas, deja el modo Origen solo en una instalación.</p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${savedMode === "origin" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
        {savedMode === "origin" ? "Origen activo" : "Consultas desactivadas"}
      </span>
    </div>

    <fieldset className="mt-5 grid gap-3 sm:grid-cols-2" disabled={saving}>
      <label className={`cursor-pointer rounded-lg border p-4 transition ${syncMode === "origin" ? "border-accent bg-accent-soft/40" : "border-line hover:bg-accent-soft/20"}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="radio" name="calendar-sync-mode" value="origin" checked={syncMode === "origin"} onChange={() => setSyncMode("origin")} className="accent-[var(--action-primary)]" />Modo Origen</span>
        <span className="mt-2 block pl-6 text-xs leading-5 text-muted">Permite conectar cuentas y ejecutar sincronizaciones automáticas y manuales desde esta instalación.</span>
      </label>
      <label className={`cursor-pointer rounded-lg border p-4 transition ${syncMode === "disabled" ? "border-accent bg-accent-soft/40" : "border-line hover:bg-accent-soft/20"}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="radio" name="calendar-sync-mode" value="disabled" checked={syncMode === "disabled"} onChange={() => setSyncMode("disabled")} className="accent-[var(--action-primary)]" />Desactivar consultas</span>
        <span className="mt-2 block pl-6 text-xs leading-5 text-muted">Detiene las consultas a Google y Outlook y bloquea nuevos flujos OAuth. La configuración y los eventos guardados se conservan.</span>
      </label>
    </fieldset>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button type="button" variant="primary" size="compact" loading={saving} disabled={saving || syncMode === savedMode} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar modo"}</Button>
      {notice && <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-danger" : "text-success"}`}>{notice}</p>}
    </div>
    <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-subtle">Esta fase controla las consultas en esta instalación. La entrega de eventos a otra instalación por API se habilitará en la siguiente fase.</p>
  </section>;
}
