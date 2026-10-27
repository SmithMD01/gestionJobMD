"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateDialog } from "../create-dialog";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { ModuleHeader } from "../module-layout";
import { RowActions } from "../row-actions";
import { ViewDetailsDialog } from "../view-details-dialog";
import { CompanyForm } from "./company-form";
import { CompanyEditForm } from "./company-edit-form";
import { CompanyMemberSettingsForm } from "./company-member-settings-form";
import { Button } from "@/components/ui/button";
import type { AssignableUser, CompanyMember } from "./company-member-selector";

type CompanyRow = { id: string; name: string; isActive: boolean; memberIds: string[]; memberNames: string[]; members: CompanyMember[] };

export function CompaniesPanel({ companies, activeId, canManage, users, currentUserId }: { companies: CompanyRow[]; activeId?: string; canManage: boolean; users: AssignableUser[]; currentUserId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [createdMessage, setCreatedMessage] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [editingMember, setEditingMember] = useState<{ companyId: string; member: CompanyMember } | null>(null);
  const [memberPending, setMemberPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const columns: TableColumn<CompanyRow>[] = [
    { key: "name", label: "Empresa", className: "w-[40%]", render: (item) => <span className="font-semibold text-ink">{item.name}</span> },
    { key: "members", label: "Usuarios", className: "w-[20%]", render: (item) => `${item.memberNames.length} asignado${item.memberNames.length === 1 ? "" : "s"}` },
    { key: "status", label: "Estado", className: "w-[25%]", render: (item) => item.isActive ? (item.id === activeId ? "Activa · Seleccionada" : "Activa") : (item.id === activeId ? "Inactiva · Seleccionada" : "Inactiva") },
    { key: "actions", label: "Acciones", className: "w-[15%]", render: (item) => <RowActions label={item.name} actions={[
      { label: "Ver detalle", onSelect: () => setSelectedCompany(item) },
      ...(canManage ? [{ label: "Editar", onSelect: () => setEditingCompany(item) }] : []),
      ...(canManage && item.isActive ? [{ label: item.id === activeId ? "Ver proyectos" : "Abrir proyectos", onSelect: () => void openProjects(item) }] : []),
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
        canManage && <CreateDialog title="Nueva empresa" triggerLabel="Nueva empresa" open={createOpen} onOpenChange={setCreateOpen} busy={createPending}><CompanyForm users={users} currentUserId={currentUserId} onPendingChange={setCreatePending} onCreated={() => { setCreatedMessage("Empresa creada correctamente."); setCreateOpen(false); }} /></CreateDialog>
      } />
      {createdMessage && <p role="status" className="mt-4 text-sm text-success">{createdMessage}</p>}
      {actionError && <p role="alert" className="mt-4 text-sm text-danger">{actionError}</p>}
      <DataTable
        rows={companies}
        filterKey={query}
        filterRow={(item) => item.name.toLocaleLowerCase("es-PE").includes(query.trim().toLocaleLowerCase("es-PE"))}
        toolbar={<>
        <label className="min-w-52 flex-1 text-sm font-medium"><span className="sr-only">Buscar empresa</span>
          <input type="search" value={query} placeholder="Buscar empresa" onChange={(event) => setQuery(event.target.value)} className="ui-field block" />
        </label>
        </>}
        columns={columns}
        rowKey={(item) => item.id}
        emptyMessage={companies.length === 0 ? "Aún no hay empresas disponibles." : "No hay empresas que coincidan con la búsqueda."}
      />
      <ViewDetailsDialog title="Detalle de la empresa" open={selectedCompany !== null} onOpenChange={(open) => { if (!open) setSelectedCompany(null); }}>
        {selectedCompany && <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Nombre</dt><dd className="mt-1 font-medium">{selectedCompany.name}</dd></div>
          <div><dt className="text-sm text-muted">Estado</dt><dd className="mt-1 font-medium">{selectedCompany.isActive ? (selectedCompany.id === activeId ? "Activa · Seleccionada" : "Activa") : "Inactiva"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-sm text-muted">Usuarios asignados</dt><dd className="mt-2 space-y-2">
            {selectedCompany.members.length === 0 ? <span className="text-sm text-muted">Sin usuarios asignados</span> : selectedCompany.members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{member.name}</span><span className="block truncate text-xs text-muted">{member.email} · {member.banned ? "Acceso inactivo" : "Acceso activo"}{member.visibleInActivityAssignments ? " · Visible en actividades" : " · No visible en actividades"}</span></span>
              {canManage && <Button type="button" variant="secondary" size="compact" className="!px-2.5 !py-1.5 !text-xs" onClick={() => { setSelectedCompany(null); setEditingMember({ companyId: selectedCompany.id, member }); }}>Configurar</Button>}
            </div>)}
          </dd></div>
        </dl>}
      </ViewDetailsDialog>
      <CreateDialog title="Editar empresa" triggerLabel="Editar empresa" showTrigger={false} open={editingCompany !== null} onOpenChange={(open) => { if (!open) setEditingCompany(null); }} busy={editPending}>
        {editingCompany && <CompanyEditForm companyId={editingCompany.id} initialName={editingCompany.name} initialActive={editingCompany.isActive} initialMemberIds={editingCompany.memberIds} users={users} currentUserId={currentUserId} onPendingChange={setEditPending} onSaved={() => { setEditingCompany(null); setCreatedMessage("Empresa actualizada correctamente."); }} />}
      </CreateDialog>
      <CreateDialog title="Configuración del usuario en la empresa" triggerLabel="Configurar usuario" showTrigger={false} open={editingMember !== null} onOpenChange={(open) => { if (!open) setEditingMember(null); }} busy={memberPending}>
        {editingMember && <CompanyMemberSettingsForm companyId={editingMember.companyId} member={editingMember.member} onPendingChange={setMemberPending} onSaved={() => { setEditingMember(null); setCreatedMessage("Configuración del usuario actualizada."); }} />}
      </CreateDialog>
    </>
  );
}
