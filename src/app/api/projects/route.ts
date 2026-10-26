import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { project, projectAuditEvent } from "@/modules/projects/schema";
import { auditEvent } from "@/modules/audit/schema";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInput } from "@/modules/projects/validation";
import { createdDetail } from "@/modules/audit/details";

export async function GET(request: Request) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;

  const projects = await db.select().from(project).where(eq(project.companyId, access.company!.id)).orderBy(desc(project.updatedAt));
  return Response.json({ projects });
}

export async function POST(request: Request) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return access.response;

  const parsed = projectInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa los datos del proyecto" }, { status: 400 });

  const created = await db.transaction(async (tx) => {
    const [newProject] = await tx.insert(project).values({
      ...parsed.data,
      companyId: access.company!.id,
      createdBy: access.session!.user.id,
    }).returning();
    await tx.insert(projectAuditEvent).values({
      projectId: newProject.id,
      actorUserId: access.session!.user.id,
      action: "project.created",
    });
    await tx.insert(auditEvent).values({
      companyId: access.company!.id,
      actorUserId: access.session!.user.id,
      entityType: "project",
      entityId: newProject.id,
      entityName: newProject.name,
      action: "project.created",
      changeDetail: createdDetail("el proyecto", newProject.name),
    });
    return newProject;
  });

  return Response.json({ project: created }, { status: 201 });
}
