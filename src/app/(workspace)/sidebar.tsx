"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UiIcon, type IconName } from "../ui-icon";
import type { ModulePermissionKey } from "@/modules/access/catalog";
import { UserProfile } from "./user-profile";
import { Button, ButtonLink } from "@/components/ui/button";

type NavLink = { href: string; label: string; icon: IconName; visible: boolean };

export function Sidebar({ role, twoFactorEnabled, moduleAccess, userName, userEmail }: {
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  moduleAccess?: Partial<Record<ModulePermissionKey, boolean>>;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [logoExpanded, setLogoExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpenOverride, setSettingsOpenOverride] = useState<boolean | null>(null);
  const settingsOpen = settingsOpenOverride ?? (pathname.startsWith("/settings") || pathname.startsWith("/calendar-monitor"));
  const workspaceReady = role !== "admin" || !!twoFactorEnabled;
  const canAccess = (key: ModulePermissionKey) => workspaceReady && !!moduleAccess?.[key];

  const mainLinks: NavLink[] = [
    { href: "/dashboard", label: "Inicio", icon: "home", visible: canAccess("home") },
    { href: "/projects", label: "Proyectos", icon: "projects", visible: canAccess("projects") },
    { href: "/companies", label: "Empresas", icon: "companies", visible: canAccess("companies") },
    { href: "/users", label: "Usuarios", icon: "users", visible: canAccess("users") },
    { href: "/roles", label: "Roles", icon: "roles", visible: canAccess("roles") },
    { href: "/settings", label: "Configuración", icon: "settings", visible: canAccess("settings") },
    { href: "/calendar", label: "Calendario", icon: "calendar", visible: canAccess("calendar") },
    { href: "/audit", label: "Auditoría", icon: "audit", visible: canAccess("audit") },
  ];
  const accountLinks: NavLink[] = [
    { href: "/security/sessions", label: "Mis sesiones", icon: "sessions", visible: true },
    { href: "/security/password", label: "Contraseña", icon: "password", visible: true },
    { href: "/security/totp", label: "Segundo factor", icon: "shield", visible: !twoFactorEnabled },
  ];

  function link(item: NavLink) {
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
    return (
      <ButtonLink
        key={item.href}
        href={item.href}
        variant="sidebar"
        onClick={() => setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={`mx-1 !w-[calc(100%-0.5rem)] gap-2.5 rounded-lg px-2.5 text-xs font-medium ${collapsed ? "md:!w-auto md:justify-center md:px-0" : ""} ${active ? "ui-button-sidebar-active" : ""}`}
      >
        <UiIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </ButtonLink>
    );
  }

  function settingsDisclosure() {
    const active = pathname.startsWith("/settings") || pathname.startsWith("/calendar-monitor");
    const showCalendarUsage = role === "admin" && !!twoFactorEnabled && canAccess("settings.calendar-usage");
    const showPipeline = canAccess("settings.pipeline");
    return <div key="/settings" className="space-y-0.5">
      <Button type="button" variant="sidebar" onClick={() => setSettingsOpenOverride(!settingsOpen)} aria-expanded={settingsOpen} aria-controls="sidebar-settings-submodules" aria-label={collapsed ? "Configuración" : undefined} title={collapsed ? "Configuración" : undefined} className={`mx-1 !w-[calc(100%-0.5rem)] rounded-lg px-2.5 text-xs font-medium ${collapsed ? "md:!w-auto md:justify-center md:px-0" : ""} ${active ? "ui-button-sidebar-active" : ""}`}>
        <UiIcon name="settings" className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <><span className="min-w-0 flex-1 truncate text-left">Configuración</span><UiIcon name="chevronDown" className={`h-3.5 w-3.5 shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`} /></>}
      </Button>
      {settingsOpen && <div id="sidebar-settings-submodules" className="space-y-0.5 pl-3">
        {showPipeline && <ButtonLink href="/settings/pipeline" variant="sidebar" size="compact" onClick={() => { setSettingsOpenOverride(null); setMobileOpen(false); }} aria-current={pathname === "/settings/pipeline" ? "page" : undefined} className={`!w-full justify-start gap-2 rounded-lg px-2.5 text-[11px] ${collapsed ? "md:!w-auto md:justify-center md:px-0" : ""} ${pathname === "/settings/pipeline" ? "ui-button-sidebar-active" : ""}`}><UiIcon name="projects" className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">Pipeline de desarrollo</span>}</ButtonLink>}
        {showCalendarUsage && <ButtonLink href="/calendar-monitor" variant="sidebar" size="compact" onClick={() => { setSettingsOpenOverride(null); setMobileOpen(false); }} aria-current={pathname === "/calendar-monitor" ? "page" : undefined} aria-label={collapsed ? "Consumo de calendario" : undefined} title={collapsed ? "Consumo de calendario" : undefined} className={`!w-full justify-start gap-2 rounded-lg px-2.5 text-[11px] ${collapsed ? "md:!w-auto md:justify-center md:px-0" : ""} ${pathname === "/calendar-monitor" ? "ui-button-sidebar-active" : ""}`}><UiIcon name="calendar" className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">Consumo de calendario</span>}</ButtonLink>}
        {!showPipeline && !showCalendarUsage && <p className="px-3 py-1 text-[10px] text-subtle">Sin submódulos disponibles</p>}
      </div>}
    </div>;
  }

  return (
    <aside className={`m-3 shrink-0 rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-[width] duration-200 md:sticky md:top-3 md:ml-3 md:mr-0 md:flex md:h-[calc(100vh-1.5rem)] md:flex-col ${collapsed ? "md:w-[72px]" : "md:w-56"}`}>
      <div className={`relative flex items-center gap-2 px-3 py-3 ${collapsed ? "md:flex-col md:px-2" : ""} ${logoExpanded && !collapsed ? "md:flex-col md:gap-2" : ""}`}>
        <Button
          variant="secondary"
          type="button"
          onClick={() => setLogoExpanded((value) => !value)}
          aria-label={logoExpanded ? "Reducir logo" : "Ampliar logo"}
          aria-pressed={logoExpanded}
          title={logoExpanded ? "Reducir logo" : "Ampliar logo"}
          className={`!min-h-0 !p-0 shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-accent ${logoExpanded && !collapsed ? "md:mx-auto md:h-44 md:w-44" : ""}`}
        >
          <Image src="/brand.svg" alt="" width={96} height={96} priority className={`block aspect-square transition-[width,height] duration-200 ${logoExpanded ? collapsed ? "h-12 w-12" : "h-44 w-44" : "h-9 w-9"}`} />
        </Button>
        {!collapsed && !logoExpanded && (
          <Link href="/dashboard" className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-ink">Gestión MD</span>
            <span className="mt-1 block text-xs text-subtle">Job Space</span>
          </Link>
        )}
        <Button
          variant="sidebar"
          size="icon"
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          className="!flex ml-auto rounded-lg md:!hidden"
        ><UiIcon name="menu" /></Button>
        <Button
          variant="sidebar"
          size="icon"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          className={`!hidden shrink-0 rounded-lg md:!flex ${logoExpanded && !collapsed ? "absolute right-2 top-2" : collapsed ? "" : "ml-auto"}`}
        ><UiIcon name={collapsed ? "panelOpen" : "panelClose"} /></Button>
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3`}>
        <div className="mt-5">
          {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">General</p>}
          <nav aria-label="Principal" className="mt-1.5 space-y-0.5">{mainLinks.filter((item) => item.visible).map((item) => item.href === "/settings" ? settingsDisclosure() : link(item))}</nav>
        </div>

        <div className="mt-auto border-t border-line pt-3">
          {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">Cuenta</p>}
          <nav aria-label="Cuenta" className="mt-1.5 space-y-0.5">{accountLinks.filter((item) => item.visible).map(link)}</nav>
        </div>
      </div>
      <div className={`${mobileOpen ? "block" : "hidden md:block"} border-t border-line p-2`}>
        <UserProfile name={userName} email={userEmail} collapsed={collapsed} />
      </div>
    </aside>
  );
}
