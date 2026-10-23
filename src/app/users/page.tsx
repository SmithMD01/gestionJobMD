import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-session";
import { UsersPanel } from "./users-panel";

export default async function UsersPage() {
  const session = await requireAdmin();
  const result = await auth.api.listUsers({ query: { limit: 100, offset: 0 }, headers: await headers() });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-slate-600 underline">Volver</Link>
      <h1 className="mt-6 text-3xl font-semibold">Usuarios</h1>
      <p className="mt-2 text-slate-600">Solo el administrador crea y desactiva cuentas. Entrega la contraseña inicial por un canal seguro, fuera de esta aplicación.</p>
      <UsersPanel currentUserId={session.user.id} initialUsers={result.users} />
    </main>
  );
}
