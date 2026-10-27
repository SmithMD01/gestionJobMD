"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-xs font-semibold text-muted">
        {recovery ? "Código de recuperación" : "Código temporal"}
        <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required className="ui-field mt-1.5 block text-center tracking-[0.25em]" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button variant="primary" loading={pending} className="w-full !min-h-10">{pending ? "Verificando…" : "Verificar"}</Button>
      <button type="button" onClick={() => { setRecovery(!recovery); setCode(""); setError(""); }} className="w-full text-center text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">
        {recovery ? "Usar código temporal" : "Usar código de recuperación"}
      </button>
    </form>
  );
}
