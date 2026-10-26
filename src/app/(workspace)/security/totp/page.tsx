import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { TotpSetup } from "./totp-setup";

export default async function TotpPage() {
  const session = await requireSession();
  if (session.user.twoFactorEnabled) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-3xl font-semibold">Configurar segundo factor</h1>
      <p className="mt-3 text-muted">Usa una aplicación autenticadora. Guarda los códigos de recuperación fuera de este sistema; se muestran una sola vez.</p>
      <TotpSetup />
    </main>
  );
}
