import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { project } from "@/modules/projects/schema";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [item] = await db.select().from(project).where(and(eq(project.id, id), eq(project.companyId, company.id)));
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/projects/${item.id}`} className="ui-back-link">Volver al proyecto</Link>
      <h1 className="mt-6 text-3xl font-semibold">Editar proyecto</h1>
      <ProjectForm initial={item} />
    </main>
  );
}
