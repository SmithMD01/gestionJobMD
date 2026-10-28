import { requireReadySession } from "@/lib/require-session";
import { cookies } from "next/headers";
import { ACTIVE_COMPANY_COOKIE, companiesForManagement, companiesForUser, membersForCompanies, usersForCompanyAssignment } from "@/modules/companies/context";
import { CompaniesPanel } from "./companies-panel";

export default async function CompaniesPage() {
  const session = await requireReadySession();
  const companies = await companiesForManagement(session.user.id);
  const selectableCompanies = await companiesForUser(session.user.id);
  const canManageCompanies = session.user.role === "admin" && !!session.user.twoFactorEnabled;
  const memberRows = await membersForCompanies(companies.map((item) => item.id));
  const availableUsers = canManageCompanies ? await usersForCompanyAssignment() : [];
  const membersByCompany = new Map<string, typeof memberRows>();
  for (const member of memberRows) {
    const current = membersByCompany.get(member.companyId) ?? [];
    current.push(member);
    membersByCompany.set(member.companyId, current);
  }
  const companiesWithMembers = companies.map((item) => ({
    ...item,
    members: (membersByCompany.get(item.id) ?? []).map((member) => ({ id: member.userId, name: member.name, email: member.email, role: member.role, banned: member.banned, visibleInActivityAssignments: member.visibleInActivityAssignments })),
    memberIds: (membersByCompany.get(item.id) ?? []).map((member) => member.userId),
    memberNames: (membersByCompany.get(item.id) ?? []).map((member) => member.name),
  }));
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const activeId = selectedId ? companies.find((item) => item.id === selectedId)?.id : selectableCompanies[0]?.id;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <CompaniesPanel companies={companiesWithMembers} activeId={activeId} canManage={canManageCompanies} users={availableUsers} currentUserId={session.user.id} />
    </main>
  );
}
