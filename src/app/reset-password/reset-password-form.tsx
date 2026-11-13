"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setError("El enlace no es válido o ya venció. Solicita uno nuevo para continuar.");
        return;
      }
      router.replace("/sign-in?passwordReset=success");
      router.refresh();
    } catch {
      setError("No se pudo cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-muted">Elige una contraseña nueva de al menos 12 caracteres. El enlace solo puede usarse una vez.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-xs font-semibold text-muted">
          Nueva contraseña
          <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="ui-field mt-1.5 block" />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Confirmar contraseña
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="ui-field mt-1.5 block" />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" loading={pending} className="w-full !min-h-10">
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
      <Link href="/sign-in" className="mt-5 inline-flex text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">Volver al inicio de sesión</Link>
    </>
  );
}
