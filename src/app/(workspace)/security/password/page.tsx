import Link from "next/link";
import { requireReadySession } from "@/lib/require-session";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const session = await requireReadySession();
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline">Volver</Link>
      <h1 className="mt-6 text-3xl font-semibold">Cambiar contraseña</h1>
      {!session.user.twoFactorEnabled ? (
        <p className="mt-4 text-muted">Antes de cambiar la contraseña debes <Link href="/security/totp" className="underline">activar el segundo factor</Link>.</p>
      ) : <PasswordForm />}
    </main>
  );
}
