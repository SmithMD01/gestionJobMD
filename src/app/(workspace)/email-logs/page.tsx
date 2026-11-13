import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { requireReadySession } from "@/lib/require-session";
import { hasModuleAccess } from "@/modules/access/permissions";
import { activeCompanyForPage } from "@/modules/companies/context";
import { companyMember } from "@/modules/companies/schema";
import { emailDeliveryLog } from "@/modules/mail/schema";
import { EmailLogsPanel, type EmailDeliveryRow } from "./panel";

export default async function EmailLogsPage() {
  const session = await requireReadySession();
  const company = await activeCompanyForPage(session.user.id);
  if (!await hasModuleAccess(session.user.id, company.id, "email.logs", session.user.role)) notFound();

  const logs = await db.select({
    id: emailDeliveryLog.id,
    recipientEmail: emailDeliveryLog.recipientEmail,
    emailType: emailDeliveryLog.emailType,
    provider: emailDeliveryLog.provider,
    status: emailDeliveryLog.status,
    detail: emailDeliveryLog.detail,
    createdAt: emailDeliveryLog.createdAt,
  }).from(emailDeliveryLog)
    .innerJoin(companyMember, eq(emailDeliveryLog.recipientUserId, companyMember.userId))
    .where(eq(companyMember.companyId, company.id))
    .orderBy(desc(emailDeliveryLog.createdAt));

  const rows: EmailDeliveryRow[] = logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }));
  return <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8"><EmailLogsPanel companyName={company.name} rows={rows} /></main>;
}
