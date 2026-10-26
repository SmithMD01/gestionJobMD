"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavbarBackLink() {
  const pathname = usePathname();
  const detailMatch = pathname?.match(/^\/projects\/([^/]+)$/);
  const editMatch = pathname?.match(/^\/projects\/([^/]+)\/edit$/);

  if (pathname === "/projects/new" || detailMatch) {
    return <Link href="/projects" className="ui-back-link">Volver a proyectos</Link>;
  }

  if (editMatch) {
    return <Link href={`/projects/${editMatch[1]}`} className="ui-back-link">Volver al proyecto</Link>;
  }

  if (pathname === "/projects" || pathname === "/companies" || pathname === "/users" || pathname === "/audit" || pathname === "/security/totp" || pathname === "/security/password" || pathname === "/security/sessions") {
    return <Link href="/dashboard" className="ui-back-link">Volver al panel</Link>;
  }

  return null;
}
