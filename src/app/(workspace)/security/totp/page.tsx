import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { TotpSetup } from "./totp-setup";

export default async function TotpPage() {
  const session = await requireSession();
  if (session.user.twoFactorEnabled) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline">Volver</Link>
      <h1 className="mt-6 text-3xl font-semibold">Configurar segundo factor</h1>
      <p className="mt-3 text-muted">Usa una aplicación autenticadora. Guarda los códigos de recuperación fuera de este sistema; se muestran una sola vez.</p>
      <TotpSetup />
    </main>
  );
}
