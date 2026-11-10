import { cookies } from "next/headers";
import { requireSession } from "@/lib/require-session";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser, companiesForUser } from "@/modules/companies/context";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { notificationsForCompany } from "@/modules/notifications/queries";
import { moduleAccessForUser } from "@/modules/access/permissions";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarAccount, calendarInstanceConfig, companyCalendarBinding } from "@/modules/calendar/schema";
import { CalendarSyncAgent } from "./calendar/calendar-sync-agent";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const [companies, selectedCompany] = await Promise.all([
    companiesForUser(session.user.id),
    activeCompanyForUser(session.user.id, selectedId),
  ]);
  const activeId = selectedCompany?.id;
  const [notifications, moduleAccess] = await Promise.all([
    activeId ? notificationsForCompany(activeId) : Promise.resolve([]),
    moduleAccessForUser(session.user.id, activeId, session.user.role),
  ]);
  const [[calendarBinding], [calendarConfig]] = await Promise.all([
    activeId ? db.select({ accountId: companyCalendarBinding.accountId, isEnabled: companyCalendarBinding.isEnabled, showCentralized: companyCalendarBinding.showCentralized })
      .from(companyCalendarBinding).where(and(eq(companyCalendarBinding.companyId, activeId), eq(companyCalendarBinding.userId, session.user.id))).limit(1) : Promise.resolve([]),
    db.select({ syncMode: calendarInstanceConfig.syncMode }).from(calendarInstanceConfig).where(eq(calendarInstanceConfig.id, 1)).limit(1),
  ]);
  const [calendarAccountState] = calendarBinding?.accountId ? await db.select({ status: calendarAccount.status, isActive: calendarAccount.isActive })
    .from(calendarAccount).where(and(eq(calendarAccount.id, calendarBinding.accountId), eq(calendarAccount.userId, session.user.id))).limit(1) : [];
  const canUseCentralized = !!moduleAccess?.["calendar.centralized"] && !!calendarBinding?.showCentralized;
  const canUseCompanyCalendar = !!moduleAccess?.calendar && !!calendarBinding?.isEnabled && calendarAccountState?.status === "connected" && calendarAccountState.isActive;
  const calendarSyncEnabled = calendarConfig?.syncMode !== "disabled" && (session.user.role !== "admin" || !!session.user.twoFactorEnabled);

  return (
    <div className="min-h-screen md:flex">
      <CalendarSyncAgent userId={session.user.id} companyId={activeId ?? ""} view={canUseCentralized ? "centralized" : "company"} enabled={!!activeId && calendarSyncEnabled && (canUseCentralized || canUseCompanyCalendar)} />
      <Sidebar role={session.user.role} twoFactorEnabled={session.user.twoFactorEnabled} moduleAccess={moduleAccess} userName={session.user.name} userEmail={session.user.email} />
      <div className="min-w-0 flex-1"><Navbar companies={companies} activeId={activeId} selectedCompanyName={selectedCompany?.name} selectedCompanyActive={selectedCompany?.isActive} notifications={notifications} />{children}</div>
    </div>
  );
}
