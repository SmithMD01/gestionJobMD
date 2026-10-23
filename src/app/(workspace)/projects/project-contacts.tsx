"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CreateDialog } from "../create-dialog";

export type ProjectContact = { id: string; name: string; email: string | null; phone: string | null };

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>;
}

function EditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="m14 5 5 5M4 20l4.5-1 10-10a2.12 2.12 0 0 0-3-3l-10 10L4 20Z" /></svg>;
}

function DeleteIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
}

function ContactForm({ projectId, initial, onSaved, onPendingChange }: {
  projectId: string;
  initial?: ProjectContact;
  onSaved: (contact: ProjectContact) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
    };

    try {
      const response = await fetch(initial ? `/api/projects/${projectId}/contacts/${initial.id}` : `/api/projects/${projectId}/contacts`, {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.contact) {
        setError(result?.error || "No se pudo guardar el contacto.");
        return;
      }
      onSaved(result.contact as ProjectContact);
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium">Nombre
      <input name="name" defaultValue={initial?.name ?? ""} required maxLength={120} autoComplete="name" className="ui-field mt-1 block" />
    </label>
    <label className="block text-sm font-medium">Correo electrónico
      <input name="email" type="email" defaultValue={initial?.email ?? ""} maxLength={254} autoComplete="email" className="ui-field mt-1 block" />
    </label>
    <label className="block text-sm font-medium">Teléfono
      <input name="phone" type="tel" defaultValue={initial?.phone ?? ""} maxLength={40} autoComplete="tel" className="ui-field mt-1 block" />
    </label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={pending} aria-busy={pending} className="ui-button ui-button-primary">{pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar contacto"}</button>
  </form>;
}

export function ProjectContacts({ projectId, initialContacts }: { projectId: string; initialContacts: ProjectContact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectContact | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [deleting, setDeleting] = useState<ProjectContact | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [lockedContact, setLockedContact] = useState<string | null>(null);

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copiado.`);
    } catch {
      setCopyMessage(`No se pudo copiar el ${label.toLowerCase()}.`);
    }
  }

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(contact: ProjectContact) {
    setEditing(contact);
    setEditorOpen(true);
  }

  function saveContact(contact: ProjectContact) {
    setContacts((current) => {
      const updated = editing ? current.map((item) => item.id === contact.id ? contact : item) : [...current, contact];
      return updated.toSorted((left, right) => left.name.localeCompare(right.name, "es-PE"));
    });
    setEditorOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function deleteContact() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/contacts/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setDeleteError(result?.error || "No se pudo eliminar el contacto.");
        return;
      }
      setContacts((current) => current.filter((contact) => contact.id !== deleting.id));
      setDeleting(null);
      router.refresh();
    } catch {
      setDeleteError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setDeletePending(false);
    }
  }

  return <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-base font-semibold">Contactos del proyecto</h2><p className="mt-1 text-xs text-subtle">Personas relacionadas con este proyecto.</p></div>
      <button type="button" onClick={openCreate} className="ui-button ui-button-primary w-full !min-h-9 !px-3 !text-xs sm:w-auto">Agregar contacto</button>
    </div>
    {copyMessage && <p role="status" aria-live="polite" className="mt-3 text-xs text-muted">{copyMessage}</p>}
    {contacts.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-line bg-canvas px-4 py-5 text-sm text-muted">Todavía no hay contactos registrados.</p> : <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {contacts.map((contact) => {
        const expanded = expandedContact === contact.id;
        return <li key={contact.id} onClick={() => {
          const nextExpanded = expanded ? null : contact.id;
          setExpandedContact(nextExpanded);
          setLockedContact(nextExpanded);
        }} onMouseLeave={() => {
          if (lockedContact !== contact.id) setExpandedContact((current) => current === contact.id ? null : current);
        }} className="group relative h-24 min-w-0 cursor-pointer overflow-hidden rounded-lg border border-line bg-canvas transition-colors hover:border-ink/30">
          <div className={`absolute inset-0 flex items-center pr-20 transition-transform duration-300 ${expanded ? "-translate-y-full" : "group-hover:-translate-y-full"}`}>
            <span className="w-full px-3 text-center text-sm font-semibold text-ink">{contact.name}</span>
          </div>
          <div className={`absolute inset-0 flex items-center pr-20 transition-transform duration-300 ${expanded ? "translate-y-0" : "translate-y-full group-hover:translate-y-0"}`}>
            {(contact.email || contact.phone) ? <div className="w-full space-y-1 px-3">
              {contact.email && <div className="flex min-w-0 items-center gap-1.5"><a href={`mailto:${contact.email}`} onClick={(event) => event.stopPropagation()} className="min-w-0 flex-1 truncate text-xs text-muted hover:text-ink">{contact.email}</a><button type="button" onClick={(event) => { event.stopPropagation(); void copyValue("Correo", contact.email!); }} aria-label={`Copiar correo de ${contact.name}`} title="Copiar correo" className="ui-button ui-button-secondary !min-h-7 !w-7 !shrink-0 !p-0"><CopyIcon /></button></div>}
              {contact.phone && <div className="flex min-w-0 items-center gap-1.5"><a href={`tel:${contact.phone}`} onClick={(event) => event.stopPropagation()} className="min-w-0 flex-1 truncate text-xs text-muted hover:text-ink">{contact.phone}</a><button type="button" onClick={(event) => { event.stopPropagation(); void copyValue("Teléfono", contact.phone!); }} aria-label={`Copiar teléfono de ${contact.name}`} title="Copiar teléfono" className="ui-button ui-button-secondary !min-h-7 !w-7 !shrink-0 !p-0"><CopyIcon /></button></div>}
            </div> : <p className="w-full px-3 text-center text-xs text-subtle">Sin correo ni teléfono</p>}
          </div>
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
            <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(contact); }} aria-label={`Editar contacto ${contact.name}`} title="Editar contacto" className="ui-button ui-button-secondary !min-h-8 !w-8 !p-0"><EditIcon /></button>
            <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteError(""); setDeleting(contact); }} aria-label={`Eliminar contacto ${contact.name}`} title="Eliminar contacto" className="ui-button ui-button-danger !min-h-8 !w-8 !p-0"><DeleteIcon /></button>
          </div>
        </li>;
      })}
    </ul>}

    <CreateDialog title={editing ? "Editar contacto" : "Agregar contacto"} triggerLabel="Agregar contacto" open={editorOpen} onOpenChange={(open) => { if (!open && !formPending) { setEditorOpen(false); setEditing(null); } }} busy={formPending} showTrigger={false}>
      {editorOpen && <ContactForm key={editing?.id ?? "new-contact"} projectId={projectId} initial={editing ?? undefined} onSaved={saveContact} onPendingChange={setFormPending} />}
    </CreateDialog>

    <CreateDialog title="Eliminar contacto" triggerLabel="Eliminar contacto" open={deleting !== null} onOpenChange={(open) => { if (!open && !deletePending) { setDeleting(null); setDeleteError(""); } }} busy={deletePending} showTrigger={false}>
      {deleting && <div className="space-y-4">
        <p className="text-sm leading-6 text-muted">¿Seguro que deseas eliminar a <strong className="text-ink">{deleting.name}</strong> de los contactos de este proyecto? Esta acción no se puede deshacer.</p>
        {deleteError && <p role="alert" className="text-sm text-danger">{deleteError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleting(null)} disabled={deletePending} className="ui-button ui-button-secondary">Cancelar</button>
          <button type="button" onClick={() => void deleteContact()} disabled={deletePending} aria-busy={deletePending} className="ui-button ui-button-danger">{deletePending ? "Eliminando…" : "Eliminar contacto"}</button>
        </div>
      </div>}
    </CreateDialog>
  </>;
}
