"use client";

import { useState, type FormEvent } from "react";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/security/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, totpCode }),
      });
      const result = await response.json();
      setMessage(response.ok ? "Contraseña actualizada. Se cerraron las demás sesiones." : result.error || "No se pudo cambiar la contraseña.");
      if (response.ok) { setCurrentPassword(""); setNewPassword(""); setTotpCode(""); }
    } catch {
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-slate-200 p-6">
      <label className="block text-sm font-medium">Contraseña actual
        <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">Contraseña nueva (mínimo 12 caracteres)
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" minLength={12} required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">Código de la aplicación autenticadora
        <input value={totpCode} onChange={(event) => setTotpCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <button disabled={pending} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Actualizar contraseña</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
