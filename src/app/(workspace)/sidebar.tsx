"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UiIcon, type IconName } from "../ui-icon";
import { UserProfile } from "./user-profile";

type NavLink = { href: string; label: string; icon: IconName; visible: boolean };

export function Sidebar({ role, twoFactorEnabled, userName, userEmail }: {
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [logoExpanded, setLogoExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainLinks: NavLink[] = [
    { href: "/dashboard", label: "Inicio", icon: "home", visible: true },
    { href: "/projects", label: "Proyectos", icon: "projects", visible: role === "admin" && !!twoFactorEnabled },
    { href: "/companies", label: "Empresas", icon: "companies", visible: true },
    { href: "/users", label: "Usuarios", icon: "users", visible: role === "admin" && !!twoFactorEnabled },
    { href: "/audit", label: "Auditoría", icon: "audit", visible: role === "admin" && !!twoFactorEnabled },
  ];
  const accountLinks: NavLink[] = [
    { href: "/security/sessions", label: "Mis sesiones", icon: "sessions", visible: true },
    { href: "/security/password", label: "Contraseña", icon: "password", visible: true },
    { href: "/security/totp", label: "Segundo factor", icon: "shield", visible: !twoFactorEnabled },
  ];

  function link(item: NavLink) {
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={`mx-1 flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${collapsed ? "md:justify-center md:px-0" : ""} ${active ? "bg-hover text-ink" : "text-muted hover:bg-hover hover:text-ink"}`}
      >
        <UiIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside className={`m-3 shrink-0 rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-[width] duration-200 md:sticky md:top-3 md:ml-3 md:mr-0 md:flex md:h-[calc(100vh-1.5rem)] md:flex-col ${collapsed ? "md:w-[72px]" : "md:w-56"}`}>
      <div className={`relative flex items-center gap-2 px-3 py-3 ${collapsed ? "md:flex-col md:px-2" : ""} ${logoExpanded && !collapsed ? "md:flex-col md:gap-2" : ""}`}>
        <button
          type="button"
          onClick={() => setLogoExpanded((value) => !value)}
          aria-label={logoExpanded ? "Reducir logo" : "Ampliar logo"}
          aria-pressed={logoExpanded}
          title={logoExpanded ? "Reducir logo" : "Ampliar logo"}
          className={`shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ink ${logoExpanded && !collapsed ? "md:mx-auto md:h-44 md:w-44" : ""}`}
        >
          <Image src="/brand.svg" alt="" width={96} height={96} priority className={`block aspect-square transition-[width,height] duration-200 ${logoExpanded ? collapsed ? "h-12 w-12" : "h-44 w-44" : "h-9 w-9"}`} />
        </button>
        {!collapsed && !logoExpanded && (
          <Link href="/dashboard" className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-ink">Gestión MD</span>
            <span className="mt-1 block text-xs text-subtle">Job Space</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-hover md:hidden"
        ><UiIcon name="menu" /></button>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover md:flex ${logoExpanded && !collapsed ? "absolute right-2 top-2" : collapsed ? "" : "ml-auto"}`}
        ><UiIcon name={collapsed ? "panelOpen" : "panelClose"} /></button>
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3`}>
        <div className="mt-5">
          {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">General</p>}
          <nav aria-label="Principal" className="mt-1.5 space-y-0.5">{mainLinks.filter((item) => item.visible).map(link)}</nav>
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
