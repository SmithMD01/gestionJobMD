import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { project } from "@/modules/projects/schema";
import { ProjectsPanel } from "./projects-panel";

export default async function ProjectsPage() {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const projects = await db.select({
    id: project.id, name: project.name, objective: project.objective, description: project.description, status: project.status,
    startDate: project.startDate, endDate: project.endDate,
  }).from(project).where(eq(project.companyId, company.id)).orderBy(desc(project.updatedAt));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <ProjectsPanel projects={projects} companyName={company.name} readOnly={!company.isActive} />
    </main>
  );
}
