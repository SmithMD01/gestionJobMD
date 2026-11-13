"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const confirmationMessage = "Si el correo está registrado, enviaremos un enlace.";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Keep the response identical so this form never confirms whether an account exists.
    } finally {
      setMessage(confirmationMessage);
      setPending(false);
    }
  }

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-muted">Ingresa el correo asociado a tu usuario. Si existe, recibirás un enlace para cambiar la contraseña.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-xs font-semibold text-muted">
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required maxLength={254} className="ui-field mt-1.5 block" />
        </label>
        {message && <p role="status" className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-ink">{message}</p>}
        <Button type="submit" variant="primary" loading={pending} className="w-full !min-h-10">
          {pending ? "Procesando…" : "Enviar enlace"}
        </Button>
      </form>
      <Link href="/sign-in" className="mt-5 inline-flex text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">Volver al inicio de sesión</Link>
    </>
  );
}
