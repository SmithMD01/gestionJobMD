import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAdmin } from "@/lib/require-session";
import { activeCompanyForPage } from "@/modules/companies/context";
import { auditEvent } from "@/modules/audit/schema";
import { user } from "@/db/auth-schema";
import { AuditPanel, type AuditRow } from "./audit-panel";

export default async function AuditPage() {
  const session = await requireAdmin();
  const company = await activeCompanyForPage(session.user.id);
  const events = await db.select({
    id: auditEvent.id,
    entityType: auditEvent.entityType,
    entityId: auditEvent.entityId,
    entityName: auditEvent.entityName,
    action: auditEvent.action,
    changeDetail: auditEvent.changeDetail,
    actorName: user.name,
    createdAt: auditEvent.createdAt,
  }).from(auditEvent)
    .innerJoin(user, eq(auditEvent.actorUserId, user.id))
    .where(eq(auditEvent.companyId, company.id))
    .orderBy(desc(auditEvent.createdAt));

  const rows: AuditRow[] = events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }));
  return <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8"><AuditPanel companyName={company.name} rows={rows} /></main>;
}
