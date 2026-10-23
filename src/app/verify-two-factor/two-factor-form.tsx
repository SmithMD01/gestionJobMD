"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = recovery
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.status === 429 ? "Demasiados intentos. Espera un momento." : "Código incorrecto o vencido.");
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-line p-6">
      <label className="block text-sm font-medium">
        {recovery ? "Código de recuperación" : "Código temporal"}
        <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required className="mt-1 block w-full rounded-md border border-line px-3 py-2" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-ink px-4 py-2 text-on-primary disabled:opacity-50">Verificar</button>
      <button type="button" onClick={() => { setRecovery(!recovery); setCode(""); setError(""); }} className="text-sm text-muted underline">
        {recovery ? "Usar código temporal" : "Usar código de recuperación"}
      </button>
    </form>
  );
}
