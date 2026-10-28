import { cookies } from "next/headers";
import { requireSession } from "@/lib/require-session";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser, companiesForUser } from "@/modules/companies/context";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { notificationsForCompany } from "@/modules/notifications/queries";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const [companies, selectedCompany] = await Promise.all([
    companiesForUser(session.user.id),
    activeCompanyForUser(session.user.id, selectedId),
  ]);
  const activeId = selectedCompany?.id;
  const notifications = activeId ? await notificationsForCompany(activeId) : [];

  return (
    <div className="min-h-screen md:flex">
      <Sidebar role={session.user.role} twoFactorEnabled={session.user.twoFactorEnabled} userName={session.user.name} userEmail={session.user.email} />
      <div className="min-w-0 flex-1"><Navbar companies={companies} activeId={activeId} selectedCompanyName={selectedCompany?.name} selectedCompanyActive={selectedCompany?.isActive} notifications={notifications} />{children}</div>
    </div>
  );
}
