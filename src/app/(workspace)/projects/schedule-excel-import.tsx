"use client";

import { useState } from "react";
import type { ProjectScheduleItem } from "./project-schedule";

type ImportedItem = Omit<ProjectScheduleItem, "id" | "sortOrder">;
type ImportError = { row?: number; field?: string; category: "Formato" | "Valores"; message: string };

export function ScheduleExcelImport({ projectId, onImported, onPendingChange }: { projectId: string; onImported: (items: ImportedItem[]) => void; onPendingChange: (pending: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [summary, setSummary] = useState<{ rows: number; validRows: number; sheet: string } | null>(null);
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [pending, setPending] = useState(false);

  function selectFile(next: File | null) {
    setFile(next);
    setErrors([]);
    setSummary(null);
    setItems([]);
  }

  async function validateFile() {
    if (!file) {
      setErrors([{ category: "Formato", message: "Selecciona un archivo Excel para validar." }]);
      return;
    }
    setPending(true);
    onPendingChange(true);
    setErrors([]);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/schedule/import`, { method: "POST", body });
      const result = await response.json().catch(() => null) as { valid?: boolean; items?: ImportedItem[]; errors?: ImportError[]; summary?: { rows: number; validRows: number; sheet: string } } | null;
      if (!response.ok || !result?.valid) {
        setErrors(result?.errors ?? [{ category: "Formato", message: "No se pudo validar el archivo." }]);
        setSummary(null);
        setItems([]);
        return;
      }
      setErrors([]);
      setSummary(result.summary ?? { rows: result.items?.length ?? 0, validRows: result.items?.length ?? 0, sheet: "Cronograma" });
      setItems(result.items ?? []);
    } catch {
      setErrors([{ category: "Formato", message: "No se pudo conectar con el validador del cronograma." }]);
      setItems([]);
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return <div className="space-y-4">
    <div className="rounded-lg border border-line bg-canvas p-3 text-sm text-muted">
      Descarga la plantilla, completa una fila por fase o actividad y vuelve a adjuntarla. La importación se cargará en el editor del cronograma para que puedas revisar y guardar los cambios.
    </div>
    <a href="/templates/gantt-template.xlsx" download className="ui-button ui-button-secondary">Descargar plantilla Excel</a>
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="schedule-excel-file">Archivo Excel</label>
      <input id="schedule-excel-file" type="file" accept=".xlsx,.xls" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} className="ui-field block !py-2" />
      <p className="text-xs text-subtle">Formatos permitidos: .xlsx y .xls. Tamaño máximo: 5 MB.</p>
    </div>
    <button type="button" onClick={() => void validateFile()} disabled={pending || !file} className="ui-button ui-button-primary">{pending ? "Validando…" : "Validar archivo"}</button>
    {summary && <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-ink">Se validaron {summary.validRows} filas en la hoja «{summary.sheet}». Ya puedes cargarlas al editor.</div>}
    {errors.length > 0 && <div role="alert" className="max-h-56 overflow-y-auto rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"><p className="font-semibold">No se puede cargar el archivo todavía.</p><ul className="mt-2 space-y-1">{errors.map((error, index) => <li key={`${error.row ?? "file"}-${error.field ?? "general"}-${index}`}><span className="font-semibold">{error.category}{error.row ? ` · fila ${error.row}` : ""}{error.field ? ` · ${error.field}` : ""}:</span> {error.message}</li>)}</ul></div>}
    {items.length > 0 && errors.length === 0 && <div className="flex justify-end"><button type="button" onClick={() => onImported(items)} className="ui-button ui-button-primary">Cargar {items.length} {items.length === 1 ? "fila" : "filas"} al editor</button></div>}
  </div>;
}
