import { ThemeToggle } from "../theme-toggle";
import { CompanySwitcher } from "./company-switcher";
import { NavbarClock } from "./navbar-clock";
import { NotificationBell } from "./notification-bell";

type CompanyOption = { id: string; name: string };

export function Navbar({ companies, activeId }: { companies: CompanyOption[]; activeId?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-end gap-2 px-5 pt-5 pb-1" aria-label="Barra superior">
      <ThemeToggle compact />
      <NotificationBell />
      <CompanySwitcher companies={companies} activeId={activeId} />
      <NavbarClock />
    </header>
  );
}
