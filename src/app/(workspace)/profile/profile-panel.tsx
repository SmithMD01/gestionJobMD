import Link from "next/link";
import { ModuleHeader } from "../module-layout";
import { ButtonLink } from "@/components/ui/button";

export function ProfilePanel({ name, email, role, twoFactorEnabled }: { name: string; email: string; role?: string | null; twoFactorEnabled: boolean }) {
  return (
    <section className="mt-8 space-y-6">
      <ModuleHeader title="Mi perfil" description="Gestiona tu información personal, seguridad y cuentas de calendario." />

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Información personal</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-subtle">Nombre</dt><dd className="mt-1 text-sm font-medium text-ink">{name}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-subtle">Correo principal</dt><dd className="mt-1 break-all text-sm font-medium text-ink">{email}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-subtle">Rol global</dt><dd className="mt-1 text-sm font-medium text-ink">{role === "admin" ? "Administrador" : "Usuario"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-subtle">Segundo factor</dt><dd className="mt-1 text-sm font-medium text-ink">{twoFactorEnabled ? "Activo" : "Pendiente de configuración"}</dd></div>
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Calendarios</h2>
          <p className="mt-1 text-sm text-muted">Registra tus correos de calendario, define una cuenta destino y decide en qué empresas estará disponible la vista centralizada.</p>
          <ButtonLink href="/profile/calendar" variant="primary" size="compact" className="mt-4">Configurar calendarios</ButtonLink>
        </section>
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Seguridad</h2>
          <p className="mt-1 text-sm text-muted">Administra tu contraseña, sesiones activas y segundo factor de autenticación.</p>
          <div className="mt-4 flex flex-wrap gap-2"><ButtonLink href="/security/password" variant="secondary" size="compact">Contraseña</ButtonLink><ButtonLink href="/security/sessions" variant="secondary" size="compact">Mis sesiones</ButtonLink><ButtonLink href="/security/totp" variant="secondary" size="compact">Segundo factor</ButtonLink></div>
        </section>
      </div>

      <p className="text-xs text-muted">Los permisos de acceso a módulos se gestionan desde Roles y no desde este perfil.</p>
      <Link href="/dashboard" className="text-xs text-muted underline underline-offset-2 hover:text-ink">Volver al inicio</Link>
    </section>
  );
}
