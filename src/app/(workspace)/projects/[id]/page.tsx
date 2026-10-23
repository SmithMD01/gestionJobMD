import Link from "next/link";
import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { project, projectAuditEvent } from "@/modules/projects/schema";
import { formatProjectDate, projectStatusLabel } from "@/modules/projects/constants";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [item] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, company.id)));
  if (!item) notFound();
  const events = await db.select().from(projectAuditEvent).where(eq(projectAuditEvent.projectId, id)).orderBy(desc(projectAuditEvent.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/projects" className="ui-back-link">Volver a proyectos</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{item.name}</h1>
          <p className="mt-2 text-muted">{projectStatusLabel[item.status]}</p>
        </div>
        <Link href={`/projects/${item.id}/edit`} className="ui-button ui-button-secondary">Editar</Link>
      </div>
      <section className="mt-8 space-y-5 rounded-xl border border-line bg-surface p-6">
        <div><h2 className="text-sm font-medium text-subtle">Objetivo</h2><p className="mt-1 whitespace-pre-wrap">{item.objective}</p></div>
        <div><h2 className="text-sm font-medium text-subtle">Descripción</h2><p className="mt-1 whitespace-pre-wrap">{item.description || "Sin descripción"}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h2 className="text-sm font-medium text-subtle">Inicio</h2><p className="mt-1">{formatProjectDate(item.startDate)}</p></div>
          <div><h2 className="text-sm font-medium text-subtle">Fin previsto</h2><p className="mt-1">{formatProjectDate(item.endDate)}</p></div>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Actividad del proyecto</h2>
        {events.length === 0 && <p className="mt-3 text-sm text-muted">Aún no hay actividad registrada.</p>}
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {events.map((event) => <li key={event.id}>{event.action === "project.created" ? "Proyecto creado" : "Proyecto actualizado"} · {event.createdAt.toLocaleString("es-PE")}</li>)}
        </ul>
      </section>
    </main>
  );
}
