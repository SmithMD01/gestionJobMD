import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { companyTeamMember } from "@/modules/companies/schema";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { activity, developmentStage, project, projectContact, projectSchedule, projectScheduleItem } from "@/modules/projects/schema";
import { formatProjectDate } from "@/modules/projects/constants";
import { ProjectSections } from "../project-sections";
import type { ProjectScheduleItem as ProjectScheduleItemType } from "../project-schedule";
import { ProjectStatusSelect } from "../project-status-select";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [item] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, company.id)));
  if (!item) notFound();
  const [contacts, activities, developmentStages, teamMembers, scheduleRows] = await Promise.all([
    db.select({ id: projectContact.id, name: projectContact.name, email: projectContact.email, phone: projectContact.phone })
      .from(projectContact).where(eq(projectContact.projectId, id)).orderBy(projectContact.name),
    db.select().from(activity).where(eq(activity.projectId, id)).orderBy(activity.createdAt),
    db.select({ id: developmentStage.id, name: developmentStage.name, color: developmentStage.color }).from(developmentStage).where(eq(developmentStage.isActive, true)).orderBy(developmentStage.sortOrder),
    db.select({ id: companyTeamMember.id, name: companyTeamMember.name, role: companyTeamMember.role }).from(companyTeamMember).where(eq(companyTeamMember.companyId, company.id)).orderBy(companyTeamMember.name),
    db.select().from(projectSchedule).where(eq(projectSchedule.projectId, id)),
  ]);
  const schedule = scheduleRows[0] ?? null;
  const scheduleItems = schedule ? await db.select().from(projectScheduleItem).where(eq(projectScheduleItem.scheduleId, schedule.id)).orderBy(projectScheduleItem.sortOrder) : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">{company.name}</p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-ink sm:text-3xl">{item.name}</h1>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ProjectStatusSelect project={{ id: item.id, name: item.name, objective: item.objective, description: item.description, status: item.status, startDate: item.startDate, endDate: item.endDate }} />
          <Link href={`/projects/${item.id}/edit`} className="ui-button ui-button-secondary">Editar</Link>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <section aria-labelledby="project-summary" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="project-summary" className="text-base font-semibold">Objetivo y descripción</h2>
          <dl className="mt-4 space-y-4">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Objetivo</dt><dd className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink">{item.objective}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Descripción</dt><dd className={`mt-1.5 whitespace-pre-wrap text-sm leading-6 ${item.description ? "text-ink" : "text-muted"}`}>{item.description || "Aún no se ha añadido una descripción."}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="project-details" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="project-details" className="text-base font-semibold">Datos del proyecto</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Fecha de inicio</dt><dd className="mt-1 text-sm text-ink">{formatProjectDate(item.startDate)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Fin previsto</dt><dd className="mt-1 text-sm text-ink">{formatProjectDate(item.endDate)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Creado el</dt><dd className="mt-1 text-sm text-ink">{item.createdAt.toLocaleDateString("es-PE")}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Última actualización</dt><dd className="mt-1 text-sm text-ink">{item.updatedAt.toLocaleDateString("es-PE")}</dd></div>
          </dl>
        </section>
      </div>

      <ProjectSections projectId={item.id} contacts={contacts} activities={activities} developmentStages={developmentStages} teamMembers={teamMembers} projectStartDate={item.startDate} projectEndDate={item.endDate} schedule={schedule ? { id: schedule.id, status: schedule.status, confirmedAt: schedule.confirmedAt?.toISOString() ?? null } : null} scheduleItems={scheduleItems.map((row) => ({ id: row.id, title: row.title, description: row.description, color: row.color as ProjectScheduleItemType["color"], startDate: row.startDate, endDate: row.endDate, sortOrder: row.sortOrder }))} />

    </main>
  );
}
