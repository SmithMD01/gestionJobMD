import { asc, and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireReadySession } from "@/lib/require-session";
import { db } from "@/db/client";
import { activeCompanyForPage } from "@/modules/companies/context";
import { developmentStage } from "@/modules/projects/schema";
import { hasModuleAccess } from "@/modules/access/permissions";
import { ModuleHeader } from "../../module-layout";
import { PipelineSettings } from "./pipeline-settings";

export default async function PipelineSettingsPage() {
  const session = await requireReadySession();
  const company = await activeCompanyForPage(session.user.id);
  const canAccess = await hasModuleAccess(session.user.id, company.id, "settings.pipeline", session.user.role);
  if (!canAccess) notFound();
  const stages = await db.select({ id: developmentStage.id, name: developmentStage.name, color: developmentStage.color, sortOrder: developmentStage.sortOrder, isTerminal: developmentStage.isTerminal, isCancelled: developmentStage.isCancelled })
    .from(developmentStage).where(and(eq(developmentStage.companyId, company.id), eq(developmentStage.isActive, true))).orderBy(asc(developmentStage.sortOrder));
  return <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
    <ModuleHeader title="Pipeline de desarrollo" description={`Configura las etapas que se comparten entre todos los proyectos de ${company.name}.`} />
    <PipelineSettings initialStages={stages} readOnly={!company.isActive || session.user.role !== "admin"} />
  </main>;
}
