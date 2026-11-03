"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Stage = { id: string; name: string; color: string; sortOrder: number; isTerminal: boolean; isCancelled: boolean };
const colors = [
  { value: "blue", label: "Azul", className: "bg-blue-500" },
  { value: "violet", label: "Violeta", className: "bg-violet-500" },
  { value: "amber", label: "Ámbar", className: "bg-amber-500" },
  { value: "green", label: "Verde", className: "bg-green-500" },
  { value: "neutral", label: "Gris", className: "bg-slate-400" },
];

export function PipelineSettings({ initialStages, readOnly }: { initialStages: Stage[]; readOnly: boolean }) {
  const [stages, setStages] = useState(initialStages);
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function updateStage(id: string, patch: Partial<Stage>) {
    setStages((current) => {
      let next = current.map((stage) => {
      if (stage.id === id) return { ...stage, ...patch };
      if (patch.isTerminal) return { ...stage, isTerminal: false };
      if (patch.isCancelled) return { ...stage, isCancelled: false };
      return stage;
      });
      if (patch.isCancelled) {
        const cancelled = next.find((stage) => stage.id === id);
        next = [...next.filter((stage) => stage.id !== id), ...(cancelled ? [cancelled] : [])];
      }
      if (patch.isTerminal) {
        const terminal = next.find((stage) => stage.id === id);
        const cancelled = next.find((stage) => stage.isCancelled);
        next = [...next.filter((stage) => stage.id !== id && !stage.isCancelled), ...(terminal ? [terminal] : []), ...(cancelled ? [cancelled] : [])];
      }
      return next.map((stage, sortOrder) => ({ ...stage, sortOrder }));
    });
    setNotice(""); setError("");
  }

  function moveStage(index: number, offset: -1 | 1) {
    const target = index + offset;
    const terminalIndex = stages.findIndex((stage) => stage.isTerminal);
    const cancelIndex = stages.findIndex((stage) => stage.isCancelled);
    if (target < 0 || target >= stages.length || stages[index]?.isCancelled || stages[index]?.isTerminal || target >= terminalIndex || target >= cancelIndex) return;
    setStages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((stage, sortOrder) => ({ ...stage, sortOrder }));
    });
    setNotice("");
  }

  async function save() {
    if (saving || readOnly) return;
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/settings/pipeline", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ stages: stages.map((stage, sortOrder) => ({ ...stage, sortOrder })) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No se pudo guardar el pipeline.");
      setStages(result.stages); setNotice("Pipeline guardado para todos los proyectos de la empresa.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el pipeline."); }
    finally { setSaving(false); }
  }

  async function addStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding || readOnly) return;
    setAdding(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/settings/pipeline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, color }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No se pudo crear la etapa.");
      setStages((current) => {
        const next = [...current];
        const terminalIndex = next.findIndex((stage) => stage.isTerminal);
        next.splice(terminalIndex < 0 ? Math.max(0, next.length - 1) : terminalIndex, 0, result.stage);
        return next.map((stage, sortOrder) => ({ ...stage, sortOrder }));
      }); setName(""); setColor("blue"); setNotice("Etapa agregada. Guarda el pipeline para confirmar el orden y los cambios.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo crear la etapa."); }
    finally { setAdding(false); }
  }

  async function removeStage(stage: Stage) {
    if (readOnly || saving || !window.confirm(`¿Eliminar la etapa “${stage.name}”?`)) return;
    setDeletingId(stage.id); setNotice(""); setError("");
    try {
      const response = await fetch(`/api/settings/pipeline/${stage.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No se pudo eliminar la etapa.");
      setStages((current) => current.filter((item) => item.id !== stage.id).map((item, sortOrder) => ({ ...item, sortOrder }))); setNotice("Etapa eliminada.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo eliminar la etapa."); }
    finally { setDeletingId(null); }
  }

  return <section className="mt-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-ink">Etapas del flujo</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted">Cada etapa es una columna del Kanban de Desarrollo. El cambio se aplica a todos los proyectos de la empresa. Define una etapa finalizada y otra de cancelación.</p></div><Button type="button" variant="primary" size="compact" onClick={() => { setError(""); document.getElementById("pipeline-new-stage")?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("pipeline-stage-name")?.focus(); }}>Nueva etapa</Button></div>
    {readOnly && <p className="mt-4 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-muted">La empresa está inactiva; el pipeline está disponible solo para consulta.</p>}
    <div className="mt-5 space-y-2">
      {stages.map((stage, index) => <article key={stage.id} className="grid gap-3 rounded-lg border border-line bg-canvas p-3 md:grid-cols-[minmax(10rem,1.4fr)_minmax(8rem,0.8fr)_minmax(10rem,1fr)_auto] md:items-center">
        <label className="block text-[11px] font-medium text-muted">Nombre<input value={stage.name} maxLength={80} disabled={readOnly || saving} onChange={(event) => updateStage(stage.id, { name: event.target.value })} className="ui-field mt-1 block" /></label>
        <label className="block text-[11px] font-medium text-muted">Color<select value={stage.color} disabled={readOnly || saving} onChange={(event) => updateStage(stage.id, { color: event.target.value })} className="ui-field mt-1 block">{colors.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink">
          <label className="inline-flex items-center gap-2"><input type="radio" name="terminal-stage" checked={stage.isTerminal} disabled={readOnly || saving} onChange={() => updateStage(stage.id, { isTerminal: true, isCancelled: false })} />Finalizada</label>
          <label className="inline-flex items-center gap-2"><input type="radio" name="cancelled-stage" checked={stage.isCancelled} disabled={readOnly || saving} onChange={() => updateStage(stage.id, { isCancelled: true, isTerminal: false })} />Cancelación</label>
        </div>
        <div className="flex items-center justify-end gap-1"><span className={`mr-2 size-3 rounded-full ${colors.find((option) => option.value === stage.color)?.className ?? "bg-slate-400"}`} aria-hidden="true" /><Button type="button" variant="secondary" size="compact" disabled={readOnly || saving || index === 0} aria-label={`Subir ${stage.name}`} onClick={() => moveStage(index, -1)}>↑</Button><Button type="button" variant="secondary" size="compact" disabled={readOnly || saving || index === stages.length - 1} aria-label={`Bajar ${stage.name}`} onClick={() => moveStage(index, 1)}>↓</Button><Button type="button" variant="danger" size="compact" disabled={readOnly || saving || Boolean(deletingId) || stage.isTerminal || stage.isCancelled} loading={deletingId === stage.id} aria-label={`Eliminar ${stage.name}`} onClick={() => void removeStage(stage)}>Eliminar</Button></div>
      </article>)}
      {!stages.length && <p className="rounded-lg border border-dashed border-line p-4 text-xs text-muted">No hay etapas configuradas.</p>}
    </div>
    <form id="pipeline-new-stage" onSubmit={(event) => void addStage(event)} className="mt-4 grid gap-3 rounded-lg border border-dashed border-line p-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,0.6fr)_auto] sm:items-end">
      <label className="block text-[11px] font-medium text-muted">Nueva etapa<input id="pipeline-stage-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required disabled={readOnly || adding} placeholder="Ej. Revisión" className="ui-field mt-1 block" /></label>
      <label className="block text-[11px] font-medium text-muted">Color<select value={color} onChange={(event) => setColor(event.target.value)} disabled={readOnly || adding} className="ui-field mt-1 block">{colors.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <Button type="submit" variant="secondary" size="compact" disabled={readOnly || adding || !name.trim()} loading={adding}>{adding ? "Agregando…" : "Agregar etapa"}</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}{notice && <p role="status" className="mt-3 text-xs text-success">{notice}</p>}
    <div className="mt-5 flex justify-end border-t border-line pt-4"><Button type="button" variant="primary" size="compact" disabled={readOnly || saving || !stages.some((stage) => stage.isTerminal) || !stages.some((stage) => stage.isCancelled) || stages.findIndex((stage) => stage.isTerminal) !== stages.length - 2 || stages.some((stage) => !stage.name.trim())} loading={saving} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar pipeline"}</Button></div>
    <p className="mt-2 text-[10px] text-muted">La etapa Finalizada se mantiene al final del flujo activo y Canceladas queda como última columna. Las etapas con actividades asignadas no se pueden eliminar.</p>
  </section>;
}
