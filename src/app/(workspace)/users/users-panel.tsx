"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { CreateDialog } from "../create-dialog";
import { DataTable, TablePagination, type TableColumn } from "../data-table";
import { ModuleHeader, ModuleToolbar } from "../module-layout";
import { RowActions } from "../row-actions";
import { ViewDetailsDialog } from "../view-details-dialog";

type ManagedUser = { id: string; name: string; email: string; role?: string | null; banned?: boolean | null };

function temporaryPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function UsersPanel({ currentUserId, initialUsers, initialTotal }: { currentUserId: string; initialUsers: ManagedUser[]; initialTotal: number }) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountMessageIsError, setAccountMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPending, setEditPending] = useState(false);
  const loadRequestId = useRef(0);

  const load = useCallback(async (nextPage: number, nextPageSize: number, nextSearch: string) => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setListError("");
    try {
      const result = await authClient.admin.listUsers({ query: {
        limit: nextPageSize,
        offset: nextPage * nextPageSize,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(nextSearch ? { searchValue: nextSearch, searchField: "email" as const } : {}),
      } });
      if (requestId !== loadRequestId.current) return;
      if (result.data) {
        setUsers(result.data.users);
        setTotal(result.data.total);
      } else {
        setUsers([]);
        setTotal(0);
        setPage(0);
        setListError("No se pudo cargar la lista de usuarios.");
      }
    } catch {
      if (requestId !== loadRequestId.current) return;
      setUsers([]);
      setTotal(0);
      setPage(0);
      setListError("No se pudo cargar la lista de usuarios.");
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setPassword("");
    const generated = temporaryPassword();
    try {
      const result = await authClient.admin.createUser({ name: name.trim(), email: email.trim().toLowerCase(), password: generated, role: "user" });
      if (result.error) {
        setMessageIsError(true);
        setMessage("No se pudo crear el usuario. Verifica los datos o si el correo ya existe.");
        return;
      }
      setPassword(generated);
      setName("");
      setEmail("");
      setMessageIsError(false);
      setMessage("Usuario creado. Copia ahora su contraseña inicial; dejará de mostrarse al salir de esta página.");
      setPage(0);
      setSearch("");
      setSearchDraft("");
      await load(0, pageSize, "");
    } catch {
      setMessageIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(user: ManagedUser) {
    if (user.id === currentUserId || pendingUserId) return;
    if (!user.banned && !window.confirm(`¿Desactivar la cuenta de ${user.name}? Se cerrarán sus sesiones.`)) return;
    setPendingUserId(user.id);
    setAccountMessage("");
    try {
      const result = user.banned
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({ userId: user.id, banReason: "Desactivado por el administrador" });
      setAccountMessageIsError(!!result.error);
      setAccountMessage(result.error ? "No se pudo cambiar el estado del usuario." : "Estado actualizado. Las sesiones de cuentas desactivadas se revocan.");
      if (!result.error) await load(page, pageSize, search);
    } catch {
      setAccountMessageIsError(true);
      setAccountMessage("No se pudo cambiar el estado del usuario.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function updateUser(event: FormEvent) {
    event.preventDefault();
    if (!editingUser || editPending) return;
    setEditPending(true);
    setAccountMessage("");
    try {
      const result = await authClient.admin.updateUser({ userId: editingUser.id, data: { name: editName.trim() } });
      if (result.error) {
        setAccountMessageIsError(true);
        setAccountMessage("No se pudo actualizar el nombre del usuario.");
        return;
      }
      setEditingUser(null);
      await load(page, pageSize, search);
      setAccountMessageIsError(false);
      setAccountMessage("Nombre actualizado.");
    } catch {
      setAccountMessageIsError(true);
      setAccountMessage("No se pudo actualizar el nombre del usuario.");
    } finally {
      setEditPending(false);
    }
  }

  async function setUserStatus(user: ManagedUser, active: boolean) {
    if (user.id === currentUserId || pendingUserId) return;
    if (!active && !window.confirm(`¿Desactivar la cuenta de ${user.name}? Se cerrarán sus sesiones.`)) return;
    setPendingUserId(user.id);
    setAccountMessage("");
    try {
      const result = active
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({ userId: user.id, banReason: "Desactivado por el administrador" });
      if (result.error) {
        setAccountMessageIsError(true);
        setAccountMessage("No se pudo cambiar el estado del usuario.");
      } else {
        setEditingUser((current) => current?.id === user.id ? { ...current, banned: !active } : current);
        setAccountMessageIsError(false);
        setAccountMessage("Estado actualizado. Las sesiones de cuentas desactivadas se revocan.");
        await load(page, pageSize, search);
      }
    } catch {
      setAccountMessageIsError(true);
      setAccountMessage("No se pudo cambiar el estado del usuario.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setMessageIsError(false);
      setMessage("Contraseña temporal copiada. Entrégala por un canal seguro.");
    } catch {
      setMessageIsError(true);
      setMessage("No se pudo copiar automáticamente. Selecciona la contraseña y cópiala manualmente.");
    }
  }

  function changeCreateOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setPassword("");
      setMessage("");
      setName("");
      setEmail("");
    }
    setCreateOpen(nextOpen);
  }

  const columns: TableColumn<ManagedUser>[] = [
    { key: "name", label: "Nombre", className: "w-[22%]", render: (user) => <span className="font-semibold text-ink">{user.name} {user.id === currentUserId && "(tú)"}</span> },
    { key: "email", label: "Correo", className: "w-[30%]", render: (user) => <span className="break-all">{user.email}</span> },
    { key: "role", label: "Rol", className: "w-[18%]", render: (user) => user.role === "admin" ? "Administrador" : "Usuario" },
    { key: "status", label: "Estado", className: "w-[12%]", render: (user) => user.banned ? "Desactivado" : "Activo" },
    { key: "actions", label: "Acciones", className: "w-[18%]", render: (user) => <RowActions label={user.name} actions={[
      { label: "Ver detalle", onSelect: () => setSelectedUser(user) },
      { label: "Editar", onSelect: () => { setEditingUser(user); setEditName(user.name); } },
      ...(user.id === currentUserId ? [] : [{ label: user.banned ? "Reactivar" : "Desactivar", tone: user.banned ? "default" as const : "danger" as const, onSelect: () => void toggle(user) }]),
    ]} /> },
  ];

  return (
    <section className="mt-8">
      <ModuleHeader title="Usuarios" description="Solo el administrador crea y desactiva cuentas. Entrega la contraseña inicial por un canal seguro, fuera de esta aplicación." action={
        <CreateDialog title="Nuevo usuario" triggerLabel="Nuevo usuario" open={createOpen} onOpenChange={changeCreateOpen} busy={pending}>
          <form onSubmit={create} className="space-y-4">
            <p className="text-sm text-muted">La contraseña inicial se mostrará una sola vez. Entrégala por un canal seguro.</p>
            {!password && <>
            <label className="block text-sm font-medium">Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="ui-field mt-1 block" />
            </label>
            <label className="block text-sm font-medium">Correo
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="ui-field mt-1 block" />
            </label>
            <button disabled={pending} aria-busy={pending} className="ui-button ui-button-primary">{pending ? "Creando…" : "Crear usuario"}</button>
            </>}
            {password && <div className="rounded-lg bg-note p-4">
              <p className="text-sm font-semibold">Contraseña temporal del nuevo usuario</p>
              <code className="mt-2 block break-all text-sm">{password}</code>
              <button type="button" onClick={() => void copyPassword()} className="ui-button ui-button-secondary mt-3">Copiar contraseña</button>
              <button type="button" onClick={() => { setPassword(""); setMessage(""); }} className="ui-button ui-button-secondary mt-3 ml-2">Crear otro usuario</button>
            </div>}
            {message && <p role={messageIsError ? "alert" : "status"} className={`text-sm ${messageIsError ? "text-danger" : "text-muted"}`}>{message}</p>}
          </form>
        </CreateDialog>
      } />
      {accountMessage && <p role={accountMessageIsError ? "alert" : "status"} className={`mt-3 text-sm ${accountMessageIsError ? "text-danger" : "text-muted"}`}>{accountMessage}</p>}
      <ModuleToolbar>
      <form onSubmit={(event) => { event.preventDefault(); const value = searchDraft.trim(); setSearch(value); setPage(0); void load(0, pageSize, value); }} className="flex min-w-0 flex-1 items-center gap-3">
        <label className="min-w-52 flex-1 text-sm font-medium"><span className="sr-only">Buscar por correo</span>
          <input type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar por correo" className="ui-field block" />
        </label>
        <button type="submit" disabled={loading} className="ui-button ui-button-secondary">Buscar</button>
      </form>
      </ModuleToolbar>
      {listError && <p role="alert" className="mt-4 text-sm text-danger">{listError} <button type="button" onClick={() => void load(page, pageSize, search)} className="underline">Reintentar</button></p>}
      <DataTable rows={users} columns={columns} rowKey={(user) => user.id} loading={loading} emptyMessage={listError ? "No se pueden mostrar las cuentas en este momento." : search ? "No hay cuentas que coincidan con ese correo." : "Aún no hay cuentas para mostrar."} />
      <TablePagination page={page} pageSize={pageSize} total={total} disabled={loading || !!listError} onPageChange={(next) => { setPage(next); void load(next, pageSize, search); }} onPageSizeChange={(size) => { setPageSize(size); setPage(0); void load(0, size, search); }} />
      <ViewDetailsDialog title="Detalle del usuario" open={selectedUser !== null} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        {selectedUser && <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Nombre</dt><dd className="mt-1 font-medium">{selectedUser.name}</dd></div>
          <div><dt className="text-sm text-muted">Correo</dt><dd className="mt-1 break-all font-medium">{selectedUser.email}</dd></div>
          <div><dt className="text-sm text-muted">Rol</dt><dd className="mt-1 font-medium">{selectedUser.role === "admin" ? "Administrador" : "Usuario"}</dd></div>
          <div><dt className="text-sm text-muted">Estado</dt><dd className="mt-1 font-medium">{selectedUser.banned ? "Desactivado" : "Activo"}</dd></div>
        </dl>}
      </ViewDetailsDialog>
      <CreateDialog title="Editar usuario" triggerLabel="Editar usuario" showTrigger={false} open={editingUser !== null} onOpenChange={(open) => { if (!open) setEditingUser(null); }} busy={editPending}>
        {editingUser && <form onSubmit={updateUser} className="space-y-4">
          <label className="block text-sm font-medium">Nombre
            <input value={editName} onChange={(event) => setEditName(event.target.value)} required maxLength={100} className="ui-field mt-1 block" />
          </label>
          <label className="block text-sm font-medium">Correo
            <input value={editingUser.email} readOnly className="ui-field mt-1 block opacity-70" />
            <span className="mt-1 block text-xs text-muted">Pendiente hasta configurar el proveedor de correo para verificar la dirección nueva.</span>
          </label>
          <label className="block text-sm font-medium">Estado
            <select value={editingUser.banned ? "inactive" : "active"} onChange={(event) => void setUserStatus(editingUser, event.target.value === "active")} disabled={editingUser.id === currentUserId || !!pendingUserId} className="ui-field mt-1 block">
              <option value="active">Activo</option><option value="inactive">Desactivado</option>
            </select>
            {editingUser.id === currentUserId && <span className="mt-1 block text-xs text-muted">No puedes desactivar tu propia cuenta.</span>}
          </label>
          <button disabled={editPending} aria-busy={editPending} className="ui-button ui-button-primary">{editPending ? "Guardando…" : "Guardar cambios"}</button>
        </form>}
      </CreateDialog>
    </section>
  );
}
