import Link from "next/link";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  const session = await requireAdmin();
  await activeCompanyForPage(session.user.id);
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/projects" className="ui-back-link">Volver a proyectos</Link>
      <h1 className="mt-6 text-3xl font-semibold">Nuevo proyecto</h1>
      <ProjectForm />
    </main>
  );
}
