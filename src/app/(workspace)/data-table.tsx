"use client";

import type { ReactNode } from "react";

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({ rows, columns, rowKey, emptyMessage, loading = false }: {
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (item: T) => string;
  emptyMessage: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="ui-table">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.className}>{column.label}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={columns.length} role="status" className="text-muted">Cargando datos…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={columns.length} className="text-muted">{emptyMessage}</td></tr>
              : rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, disabled = false }: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>{total === 0 ? "0 resultados" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total}`}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Filas por página
          <select value={pageSize} disabled={disabled} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="ui-field !w-auto !py-1.5">
            {[20, 30, 40, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" disabled={disabled || page === 0} onClick={() => onPageChange(page - 1)} className="ui-button ui-button-secondary">Anterior</button>
        <span aria-live="polite">Página {page + 1} de {totalPages}</span>
        <button type="button" disabled={disabled || page + 1 >= totalPages} onClick={() => onPageChange(page + 1)} className="ui-button ui-button-secondary">Siguiente</button>
      </div>
    </div>
  );
}
