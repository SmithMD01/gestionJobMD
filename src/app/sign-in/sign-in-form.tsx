"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (result.error) {
        setError(result.error.status === 429 ? "Demasiados intentos. Espera un momento." : "No se pudo iniciar sesión. Revisa tus datos.");
      } else if (!result.data || !("twoFactorRedirect" in result.data && result.data.twoFactorRedirect)) {
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
        Correo electrónico
        <input name="email" type="email" autoComplete="username" required className="ui-field mt-1.5 block" />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required className="ui-field mt-1.5 block" />
      </label>
      <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">¿Olvidaste tu contraseña?</Link></div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button variant="primary" loading={pending} className="w-full !min-h-10">
        {pending ? "Comprobando…" : "Entrar"}
      </Button>
    </form>
  );
}
