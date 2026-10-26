import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  const session = await requireAdmin();
  await activeCompanyForPage(session.user.id);
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Nuevo proyecto</h1>
      <ProjectForm />
    </main>
  );
}
