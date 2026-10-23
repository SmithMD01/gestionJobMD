import Link from "next/link";
import { requireReadySession } from "@/lib/require-session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await requireReadySession();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Gestión del trabajo</p>
          <h1 className="mt-1 text-3xl font-semibold">Hola, {session.user.name}</h1>
        </div>
        <SignOutButton />
      </header>
      <p className="mt-6 text-slate-600">Tu acceso está activo. Los módulos de proyectos y actividades llegarán en las próximas fases.</p>
      <nav aria-label="Cuenta" className="mt-8 flex flex-wrap gap-3">
        <Link href="/security/sessions" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Mis sesiones</Link>
        <Link href="/security/password" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Cambiar contraseña</Link>
        {!session.user.twoFactorEnabled && <Link href="/security/totp" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Activar segundo factor</Link>}
        {session.user.role === "admin" && <Link href="/users" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Administrar usuarios</Link>}
      </nav>
    </main>
  );
}
