"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
};

export type ServerTablePagination = {
  mode: "server";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
};

const PAGE_SIZES = [20, 30, 40, 50];

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage,
  loading = false,
  className = "",
  containerClassName = "",
  toolbar,
  filterRow,
  filterKey,
  sortRows,
  pagination,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (item: T) => string;
  emptyMessage: string;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  toolbar?: ReactNode;
  filterRow?: (item: T) => boolean;
  sortRows?: (items: T[]) => T[];
  /** Change this when controlled filters change to return client tables to their first page. */
  filterKey?: string;
  /** Client pagination is the default. Pass false for compact embedded tables. */
  pagination?: false | ServerTablePagination;
}) {
  const [clientPageState, setClientPageState] = useState({ page: 0, filterKey });
  const [clientPageSize, setClientPageSize] = useState(PAGE_SIZES[0]);
  const clientFilteredRows = filterRow ? rows.filter(filterRow) : rows;
  const clientRows = sortRows ? sortRows(clientFilteredRows) : clientFilteredRows;
  const serverPagination = pagination !== false && pagination?.mode === "server" ? pagination : undefined;
  const isServerPaginated = serverPagination !== undefined;
  const activeClientPage = clientPageState.filterKey === filterKey ? clientPageState.page : 0;
  const activePage = serverPagination ? serverPagination.page : activeClientPage;
  const activePageSize = serverPagination ? serverPagination.pageSize : clientPageSize;
  const total = serverPagination ? serverPagination.total : clientRows.length;
  const totalPages = Math.max(1, Math.ceil(total / activePageSize));
  const safePage = Math.min(activePage, totalPages - 1);
  const visibleRows = isServerPaginated
    ? rows
    : pagination === false
      ? clientRows
      : clientRows.slice(safePage * activePageSize, (safePage + 1) * activePageSize);

  function changePage(nextPage: number) {
    if (serverPagination) serverPagination.onPageChange(nextPage);
    else setClientPageState({ page: nextPage, filterKey });
  }

  function changePageSize(nextPageSize: number) {
    if (serverPagination) serverPagination.onPageSizeChange(nextPageSize);
    else {
      setClientPageSize(nextPageSize);
      setClientPageState({ page: 0, filterKey });
    }
  }

  const paginationDisabled = serverPagination?.disabled ?? false;

  return (
    <section className="min-w-0">
      {toolbar && <div className="mt-8 flex flex-wrap items-end gap-3">{toolbar}</div>}
      <div className={`mt-4 min-w-0 overflow-x-auto rounded-xl border border-line bg-surface ${containerClassName}`}>
        <table className={`ui-table ${className}`}>
          <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.className}>{column.label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={columns.length} role="status" className="text-muted">Cargando datos…</td></tr>
              : visibleRows.length === 0 ? <tr><td colSpan={columns.length} className="text-muted">{emptyMessage}</td></tr>
                : visibleRows.map((row, index) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render(row, index)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {pagination !== false && <nav aria-label="Paginación de tabla" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p aria-live="polite">{total === 0 ? "0 resultados" : `${safePage * activePageSize + 1}–${Math.min((safePage + 1) * activePageSize, total)} de ${total}`}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">Filas por página
            <select value={activePageSize} disabled={paginationDisabled} onChange={(event) => changePageSize(Number(event.target.value))} className="ui-field !w-auto !py-1.5">
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Button type="button" variant="secondary" disabled={paginationDisabled || safePage === 0} onClick={() => changePage(safePage - 1)}>Anterior</Button>
          <span aria-live="polite">Página {safePage + 1} de {totalPages}</span>
          <Button type="button" variant="secondary" disabled={paginationDisabled || safePage + 1 >= totalPages} onClick={() => changePage(safePage + 1)}>Siguiente</Button>
        </div>
      </nav>}
    </section>
  );
}
