import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { project } from "./schema";

export async function projectInCompany(projectId: string, companyId: string) {
  const [found] = await db.select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.companyId, companyId)))
    .limit(1);
  return found ?? null;
}
