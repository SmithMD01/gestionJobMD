"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateDialog } from "../create-dialog";
import { DataTable, TablePagination, type TableColumn } from "../data-table";
import { ModuleHeader, ModuleToolbar } from "../module-layout";
import { RowActions } from "../row-actions";
import { ViewDetailsDialog } from "../view-details-dialog";
import { CompanyForm } from "./company-form";
import { CompanyEditForm } from "./company-edit-form";

type CompanyRow = { id: string; name: string; isActive: boolean };

export function CompaniesPanel({ companies, activeId, canCreate }: { companies: CompanyRow[]; activeId?: string; canCreate: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [createdMessage, setCreatedMessage] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [actionError, setActionError] = useState("");
  const filtered = useMemo(() => companies.filter((item) => item.name.toLocaleLowerCase("es-PE").includes(query.trim().toLocaleLowerCase("es-PE"))), [companies, query]);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const columns: TableColumn<CompanyRow>[] = [
    { key: "name", label: "Empresa", className: "w-[55%]", render: (item) => <span className="font-semibold text-ink">{item.name}</span> },
    { key: "status", label: "Estado", className: "w-[30%]", render: (item) => item.isActive ? (item.id === activeId ? "Activa · Seleccionada" : "Activa") : (item.id === activeId ? "Inactiva · Seleccionada" : "Inactiva") },
    { key: "actions", label: "Acciones", className: "w-[15%]", render: (item) => <RowActions label={item.name} actions={[
      { label: "Ver detalle", onSelect: () => setSelectedCompany(item) },
      ...(canCreate ? [{ label: "Editar", onSelect: () => setEditingCompany(item) }] : []),
      ...(canCreate && item.isActive ? [{ label: item.id === activeId ? "Ver proyectos" : "Abrir proyectos", onSelect: () => void openProjects(item) }] : []),
    ]} /> },
  ];

  async function openProjects(company: CompanyRow) {
    setActionError("");
    if (company.id !== activeId) {
      try {
        const response = await fetch("/api/companies/active", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyId: company.id }),
        });
        if (!response.ok) {
          setActionError("No se pudo cambiar la empresa activa.");
          return;
        }
      } catch {
        setActionError("No se pudo conectar. Vuelve a intentarlo.");
        return;
      }
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <>
      <ModuleHeader title="Empresas" description="Cada empresa mantiene sus proyectos separados. Solo puedes elegir empresas a las que perteneces." action={
        canCreate && <CreateDialog title="Nueva empresa" triggerLabel="Nueva empresa" open={createOpen} onOpenChange={setCreateOpen} busy={createPending}><CompanyForm onPendingChange={setCreatePending} onCreated={() => { setCreatedMessage("Empresa creada correctamente."); setPage(0); setCreateOpen(false); }} /></CreateDialog>
      } />
      {createdMessage && <p role="status" className="mt-4 text-sm text-success">{createdMessage}</p>}
      <ModuleToolbar>
        <label className="min-w-52 flex-1 text-sm font-medium"><span className="sr-only">Buscar empresa</span>
          <input type="search" value={query} placeholder="Buscar empresa" onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="ui-field block" />
        </label>
      </ModuleToolbar>
      {actionError && <p role="alert" className="mt-4 text-sm text-danger">{actionError}</p>}
      <DataTable rows={visible} columns={columns} rowKey={(item) => item.id} emptyMessage={companies.length === 0 ? "Aún no hay empresas disponibles." : "No hay empresas que coincidan con la búsqueda."} />
      <TablePagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} />
      <ViewDetailsDialog title="Detalle de la empresa" open={selectedCompany !== null} onOpenChange={(open) => { if (!open) setSelectedCompany(null); }}>
        {selectedCompany && <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Nombre</dt><dd className="mt-1 font-medium">{selectedCompany.name}</dd></div>
          <div><dt className="text-sm text-muted">Estado</dt><dd className="mt-1 font-medium">{selectedCompany.isActive ? (selectedCompany.id === activeId ? "Activa · Seleccionada" : "Activa") : "Inactiva"}</dd></div>
        </dl>}
      </ViewDetailsDialog>
      <CreateDialog title="Editar empresa" triggerLabel="Editar empresa" showTrigger={false} open={editingCompany !== null} onOpenChange={(open) => { if (!open) setEditingCompany(null); }} busy={editPending}>
        {editingCompany && <CompanyEditForm companyId={editingCompany.id} initialName={editingCompany.name} initialActive={editingCompany.isActive} onPendingChange={setEditPending} onSaved={() => { setEditingCompany(null); setCreatedMessage("Empresa actualizada correctamente."); }} />}
      </CreateDialog>
    </>
  );
}
