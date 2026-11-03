"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CreateDialog } from "../create-dialog";
import { ModuleHeader } from "../module-layout";
import { RowActions } from "../row-actions";
import { DataTable, type TableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { ADMIN_REQUIRED_MODULE_KEYS, MODULE_CATALOG, type ModuleCatalogEntry } from "@/modules/access/catalog";

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  moduleKeys: string[];
};

const GROUP_LABELS: Record<ModuleCatalogEntry["group"], string> = {
  principal: "Módulos principales",
  projects: "Vistas de proyectos",
  administration: "Administración",
  control: "Control y seguimiento",
};

export function RolesPanel({ companyName, initialRoles }: { companyName: string; initialRoles: RoleRow[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [tab, setTab] = useState<"roles" | "permissions">("roles");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id ?? null);
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set(initialRoles[0]?.moduleKeys ?? []));
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedRoleId) ?? null, [roles, selectedRoleId]);

  function selectRole(role: RoleRow, nextTab: "roles" | "permissions" = "permissions") {
    setSelectedRoleId(role.id);
    setPermissionKeys(new Set(role.moduleKeys));
    setTab(nextTab);
    setMessage("");
  }

  async function createRole(event: FormEvent) {
    event.preventDefault();
    if (createPending) return;
    setCreatePending(true);
    setMessage("");
    try {
      const response = await fetch("/api/roles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.role) {
        setMessageIsError(true);
        setMessage(result?.error ?? "No se pudo crear el rol.");
        return;
      }
      const role: RoleRow = { ...result.role, description: result.role.description ?? "", moduleKeys: [] };
      setRoles((current) => [...current, role].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setName("");
      setDescription("");
      setCreateOpen(false);
      selectRole(role);
      setMessageIsError(false);
      setMessage("Rol creado. Configura ahora sus permisos de acceso.");
      router.refresh();
    } catch {
      setMessageIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setCreatePending(false);
    }
  }

  function togglePermission(entry: ModuleCatalogEntry) {
    if (!selectedRole || entry.adminOnly || (selectedRole.key === "admin" && ADMIN_REQUIRED_MODULE_KEYS.includes(entry.key))) return;
    setPermissionKeys((current) => {
      const next = new Set(current);
      if (next.has(entry.key)) {
        next.delete(entry.key);
        for (const child of MODULE_CATALOG.filter((item) => item.parentKey === entry.key)) next.delete(child.key);
      } else {
        next.add(entry.key);
        if (entry.parentKey) next.add(entry.parentKey);
      }
      return next;
    });
  }

  async function savePermissions(event: FormEvent) {
    event.preventDefault();
    if (!selectedRole || savePending) return;
    setSavePending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: selectedRole.name, description: selectedRole.description, moduleKeys: [...permissionKeys] }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(result?.error ?? "No se pudieron guardar los permisos.");
        return;
      }
      const nextKeys = result?.moduleKeys ?? [...permissionKeys];
      setRoles((current) => current.map((role) => role.id === selectedRole.id ? { ...role, moduleKeys: nextKeys } : role));
      setPermissionKeys(new Set(nextKeys));
      setMessageIsError(false);
      setMessage("Permisos guardados correctamente.");
      router.refresh();
    } catch {
      setMessageIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setSavePending(false);
    }
  }

  const columns: TableColumn<RoleRow>[] = [
    { key: "name", label: "Rol", className: "w-[24%]", render: (role) => <span className="font-semibold text-ink">{role.name}</span> },
    { key: "description", label: "Descripción", className: "w-[42%]", render: (role) => <span className="text-muted">{role.description || "Sin descripción"}</span> },
    { key: "status", label: "Estado", className: "w-[16%]", render: (role) => role.isActive ? "Activo" : "Inactivo" },
    { key: "actions", label: "Acciones", className: "w-[18%]", render: (role) => <RowActions label={role.name} actions={[{ label: "Configurar permisos", onSelect: () => selectRole(role) }]} /> },
  ];

  return (
    <section className="mt-8">
      <div className="sticky top-0 z-20 -mx-6 bg-canvas/95 px-6 pb-3 pt-1 backdrop-blur-md sm:-mx-8 sm:px-8">
        <ModuleHeader title="Roles" description={`Configura los permisos de acceso a los módulos para ${companyName}.`} action={
          tab === "roles" ? <CreateDialog title="Nuevo rol" triggerLabel="Nuevo rol" open={createOpen} onOpenChange={setCreateOpen} busy={createPending}>
            <form onSubmit={createRole} className="space-y-4">
              <label className="block text-sm font-medium">Nombre del rol
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className="ui-field mt-1 block" placeholder="Ej. Coordinador" />
              </label>
              <label className="block text-sm font-medium">Descripción
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} rows={3} className="ui-field mt-1 block" placeholder="Describe el alcance de este rol." />
              </label>
              <Button variant="primary" loading={createPending}>{createPending ? "Creando…" : "Crear rol"}</Button>
            </form>
          </CreateDialog> : selectedRole ? <Button type="submit" form="role-permissions-form" variant="primary" loading={savePending}>{savePending ? "Guardando…" : "Guardar permisos"}</Button> : null
        } />

        {message && <p role={messageIsError ? "alert" : "status"} className={`mt-4 text-sm ${messageIsError ? "text-danger" : "text-success"}`}>{message}</p>}

        <div role="tablist" aria-label="Gestión de roles" className="mt-6 flex flex-wrap gap-2 border-b border-line pb-2">
          <Button type="button" role="tab" aria-selected={tab === "roles"} variant={tab === "roles" ? "primary" : "secondary"} size="compact" onClick={() => setTab("roles")}>Roles</Button>
          <Button type="button" role="tab" aria-selected={tab === "permissions"} variant={tab === "permissions" ? "primary" : "secondary"} size="compact" disabled={!selectedRole} onClick={() => setTab("permissions")}>Configurar permisos</Button>
        </div>
      </div>

      {tab === "roles" && <DataTable rows={roles} columns={columns} rowKey={(role) => role.id} pagination={false} emptyMessage="Aún no hay roles configurados." toolbar={<p className="text-sm text-muted">Selecciona un rol para configurar sus accesos por módulo.</p>} />}

      {tab === "permissions" && selectedRole && <form id="role-permissions-form" onSubmit={savePermissions} className="mt-4 max-h-[calc(100vh-16rem)] space-y-5 overflow-y-auto overscroll-contain pr-1">
        {(Object.keys(GROUP_LABELS) as ModuleCatalogEntry["group"][]).map((group) => {
          const entries = MODULE_CATALOG.filter((entry) => entry.group === group);
          return <section key={group} className="rounded-xl border border-line bg-surface p-4" aria-labelledby={`group-${group}`}>
            <h3 id={`group-${group}`} className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">{GROUP_LABELS[group]}</h3>
            <div className="mt-3 divide-y divide-line">
              {entries.map((entry) => {
                const checked = permissionKeys.has(entry.key);
                const disabled = entry.adminOnly || (selectedRole.key === "admin" && ADMIN_REQUIRED_MODULE_KEYS.includes(entry.key));
                return <label key={entry.key} className={`flex items-start gap-3 py-3 ${entry.parentKey ? "pl-7" : ""} ${disabled ? "opacity-75" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => togglePermission(entry)} className="mt-0.5 h-4 w-4 accent-[var(--action-primary)]" />
                  <span className="min-w-0"><span className="block text-sm font-medium text-ink">{entry.label}</span><span className="mt-0.5 block text-xs text-muted">{entry.description}{entry.adminOnly ? " · Solo administradores" : disabled ? " · Obligatorio para el administrador" : ""}</span></span>
                </label>;
              })}
            </div>
          </section>;
        })}
      </form>}
    </section>
  );
}
