import { requireReadySession } from "@/lib/require-session";
import { cookies } from "next/headers";
import { ACTIVE_COMPANY_COOKIE, companiesForManagement, companiesForUser } from "@/modules/companies/context";
import { CompaniesPanel } from "./companies-panel";

export default async function CompaniesPage() {
  const session = await requireReadySession();
  const companies = await companiesForManagement(session.user.id);
  const selectableCompanies = await companiesForUser(session.user.id);
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const activeId = selectedId ? selectableCompanies.find((item) => item.id === selectedId)?.id : selectableCompanies[0]?.id;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <CompaniesPanel companies={companies} activeId={activeId} canCreate={session.user.role === "admin" && !!session.user.twoFactorEnabled} />
    </main>
  );
}
