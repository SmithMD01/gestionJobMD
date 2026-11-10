import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { requireReadySession } from "@/lib/require-session";
import { hasModuleAccess } from "@/modules/access/permissions";
import { activeCompanyForPage } from "@/modules/companies/context";
import { ModuleHeader } from "../module-layout";
import { UiIcon } from "../../ui-icon";

export default async function SettingsPage() {
  const session = await requireReadySession();
  const company = await activeCompanyForPage(session.user.id);
  const canOpenSettings = await hasModuleAccess(session.user.id, company.id, "settings", session.user.role);
  if (!canOpenSettings) notFound();

  const canOpenCalendarUsage = await hasModuleAccess(session.user.id, company.id, "settings.calendar-usage", session.user.role);
  const canOpenCalendarIntegration = await hasModuleAccess(session.user.id, company.id, "settings.calendar-integration", session.user.role);
  const canOpenPipeline = await hasModuleAccess(session.user.id, company.id, "settings.pipeline", session.user.role);

  return <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
    <ModuleHeader title="Configuración" description="Administra los parámetros y herramientas de configuración disponibles para tu cuenta." />
    {canOpenCalendarUsage || canOpenCalendarIntegration || canOpenPipeline ? <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {canOpenPipeline && <article className="flex min-h-48 flex-col rounded-xl border border-line bg-surface p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"><UiIcon name="projects" className="h-5 w-5" /></span>
        <h2 className="mt-4 text-sm font-semibold text-ink">Pipeline de desarrollo</h2>
        <p className="mt-1 flex-1 text-xs leading-5 text-muted">Define las etapas y el orden del Kanban compartido por los proyectos de la empresa.</p>
        <ButtonLink href="/settings/pipeline" size="compact" variant="secondary" className="mt-4 w-fit">{session.user.role === "admin" && company.isActive ? "Configurar etapas" : "Ver etapas"}</ButtonLink>
      </article>}
      {canOpenCalendarUsage && <>
      <article className="flex min-h-48 flex-col rounded-xl border border-line bg-surface p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"><UiIcon name="calendar" className="h-5 w-5" /></span>
        <h2 className="mt-4 text-sm font-semibold text-ink">Consumo de calendario</h2>
        <p className="mt-1 flex-1 text-xs leading-5 text-muted">Consulta las sincronizaciones, solicitudes a proveedores, cuentas y resultados recientes.</p>
        <ButtonLink href="/calendar-monitor" size="compact" variant="secondary" className="mt-4 w-fit">Abrir seguimiento</ButtonLink>
      </article>
      </>}
      {canOpenCalendarIntegration && <article className="flex min-h-48 flex-col rounded-xl border border-line bg-surface p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"><UiIcon name="calendar" className="h-5 w-5" /></span>
        <h2 className="mt-4 text-sm font-semibold text-ink">Integración de calendarios</h2>
        <p className="mt-1 flex-1 text-xs leading-5 text-muted">Elige si esta instalación consulta Google Calendar y Microsoft Outlook.</p>
        <ButtonLink href="/settings/calendar-integration" size="compact" variant="secondary" className="mt-4 w-fit">Configurar modo</ButtonLink>
      </article>}
    </section> : <p className="mt-6 rounded-xl border border-line bg-surface p-5 text-sm text-muted">No tienes submódulos de configuración disponibles.</p>}
  </main>;
}
