import { ThemeToggle } from "../theme-toggle";
import { CompanySwitcher } from "./company-switcher";
import { NavbarClock } from "./navbar-clock";
import { NavbarBackLink } from "./navbar-back-link";
import { NotificationBell } from "./notification-bell";
import type { WorkspaceNotification } from "@/modules/notifications/types";

type CompanyOption = { id: string; name: string };

export function Navbar({ companies, activeId, selectedCompanyName, selectedCompanyActive, notifications }: { companies: CompanyOption[]; activeId?: string; selectedCompanyName?: string; selectedCompanyActive?: boolean; notifications: WorkspaceNotification[] }) {
  return (
    <header className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-1" aria-label="Barra superior">
      <NavbarBackLink />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <ThemeToggle compact />
        <NotificationBell notifications={notifications} />
        <CompanySwitcher companies={companies} activeId={activeId} selectedCompanyName={selectedCompanyName} selectedCompanyActive={selectedCompanyActive} />
        <NavbarClock />
      </div>
    </header>
  );
}
