"use client";

import { useCallback, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type ManagedUser = { id: string; name: string; email: string; role?: string | null; banned?: boolean | null };

function temporaryPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function UsersPanel({ currentUserId, initialUsers }: { currentUserId: string; initialUsers: ManagedUser[] }) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await authClient.admin.listUsers({ query: { limit: 100, offset: 0 } });
      if (result.data) setUsers(result.data.users);
      else setMessage("No se pudo cargar la lista de usuarios.");
    } catch {
      setMessage("No se pudo cargar la lista de usuarios.");
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
        setMessage("No se pudo crear el usuario. Verifica los datos o si el correo ya existe.");
        return;
      }
      setPassword(generated);
      setName("");
      setEmail("");
      setMessage("Usuario creado. Copia ahora su contraseña inicial; dejará de mostrarse al salir de esta página.");
      await load();
    } catch {
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(user: ManagedUser) {
    if (user.id === currentUserId) return;
    setMessage("");
    try {
      const result = user.banned
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({ userId: user.id, banReason: "Desactivado por el administrador" });
      setMessage(result.error ? "No se pudo cambiar el estado del usuario." : "Estado actualizado. Las sesiones de cuentas desactivadas se revocan.");
    } catch {
      setMessage("No se pudo cambiar el estado del usuario.");
    }
    await load();
  }

  return (
    <div className="mt-8 space-y-10">
      <form onSubmit={create} className="space-y-4 rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold">Crear usuario</h2>
        <label className="block text-sm font-medium">Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">Correo
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <button disabled={pending} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Crear con contraseña temporal</button>
        {password && <p className="break-all rounded-md bg-amber-50 p-3 font-mono text-sm">{password}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
      </form>
      <section>
        <h2 className="text-xl font-semibold">Cuentas</h2>
        <ul className="mt-4 space-y-3">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
              <div>
                <p className="font-medium">{user.name} {user.id === currentUserId && "(tú)"}</p>
                <p className="text-sm text-slate-600">{user.email} · {user.role || "user"} · {user.banned ? "desactivado" : "activo"}</p>
              </div>
              {user.id !== currentUserId && (
                <button onClick={() => void toggle(user)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {user.banned ? "Reactivar" : "Desactivar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
