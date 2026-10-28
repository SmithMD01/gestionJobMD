"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UiIcon } from "../ui-icon";
import { Button } from "@/components/ui/button";

type CompanyOption = { id: string; name: string };

export function CompanySwitcher({ companies, activeId, selectedCompanyName, selectedCompanyActive }: { companies: CompanyOption[]; activeId?: string; selectedCompanyName?: string; selectedCompanyActive?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeCompany = companies.find((company) => company.id === activeId);
  const activeLabel = selectedCompanyName ? `${selectedCompanyName}${selectedCompanyActive === false ? " (inactiva)" : ""}` : activeCompany?.name ?? "ninguna";

  async function change(companyId: string) {
    if (companyId === activeId) { setOpen(false); return; }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/companies/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!response.ok) {
        setError("No se pudo cambiar de empresa.");
        return;
      }
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Empresa seleccionada: ${activeLabel}. Cambiar empresa`}
        aria-expanded={open}
        aria-controls="company-menu"
        title={activeLabel === "ninguna" ? "Seleccionar empresa" : activeLabel}
        className="rounded-xl text-muted"
      ><UiIcon name="companies" /></Button>
      {open && <div id="company-menu" className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-subtle">{selectedCompanyActive === false ? "Empresa inactiva · solo lectura" : "Empresa activa"}</p>
        {companies.length === 0 ? <p className="px-2 py-2 text-sm text-muted">Aún no hay empresas.</p> : companies.map((company) => (
          <Button key={company.id} type="button" variant="ghost" size="compact" disabled={pending} onClick={() => void change(company.id)} className={`w-full justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${company.id === activeId ? "font-semibold text-ink" : "text-muted"}`}>
            <span className="truncate">{company.name}</span>
            {company.id === activeId && <span className="text-xs text-subtle">Activa</span>}
          </Button>
        ))}
        {error && <p role="alert" className="px-2 py-1 text-xs text-danger">{error}</p>}
        <Link href="/companies" onClick={() => setOpen(false)} className="mt-1 block border-t border-line px-2 pt-2 text-sm text-muted hover:text-ink">Administrar empresas</Link>
      </div>}
    </div>
  );
}
