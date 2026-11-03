import { eq } from "drizzle-orm";
import { requireReadySession } from "@/lib/require-session";
import { db } from "@/db/client";
import { companiesForUser } from "@/modules/companies/context";
import { calendarAccount, calendarDestination, companyCalendarBinding } from "@/modules/calendar/schema";
import { CalendarSettingsPanel, type CalendarCompanySetting, type CalendarAccountRow } from "./calendar-settings-panel";

export default async function CalendarProfilePage({ searchParams }: { searchParams: Promise<{ calendarConnection?: string }> }) {
  const session = await requireReadySession();
  const { calendarConnection } = await searchParams;
  const [companies, accounts, destination, bindings] = await Promise.all([
    companiesForUser(session.user.id),
    db.select({ id: calendarAccount.id, provider: calendarAccount.provider, label: calendarAccount.label, email: calendarAccount.email, status: calendarAccount.status, isActive: calendarAccount.isActive })
      .from(calendarAccount).where(eq(calendarAccount.userId, session.user.id)).orderBy(calendarAccount.label),
    db.select({ accountId: calendarDestination.accountId }).from(calendarDestination).where(eq(calendarDestination.userId, session.user.id)),
    db.select({ companyId: companyCalendarBinding.companyId, accountId: companyCalendarBinding.accountId, isEnabled: companyCalendarBinding.isEnabled, showCentralized: companyCalendarBinding.showCentralized })
      .from(companyCalendarBinding).where(eq(companyCalendarBinding.userId, session.user.id)),
  ]);
  const bindingByCompany = new Map(bindings.map((binding) => [binding.companyId, binding]));
  const settings: CalendarCompanySetting[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    accountId: bindingByCompany.get(company.id)?.accountId ?? null,
    isEnabled: bindingByCompany.get(company.id)?.isEnabled ?? false,
    showCentralized: bindingByCompany.get(company.id)?.showCentralized ?? false,
  }));
  const initialAccounts: CalendarAccountRow[] = accounts.map((account) => ({ ...account, isActive: account.isActive ?? false }));
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8">
      <CalendarSettingsPanel userId={session.user.id} initialAccounts={initialAccounts} initialDestinationId={destination[0]?.accountId ?? null} initialCompanies={settings} initialConnectionResult={calendarConnection ?? null} />
    </main>
  );
}
