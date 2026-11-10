"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CreateDialog } from "../../create-dialog";
import { ModuleHeader } from "../../module-layout";
import { UiIcon } from "../../../ui-icon";
import { Button, ButtonLink } from "@/components/ui/button";
import type { CalendarSyncMode } from "@/modules/calendar/instance-config";

export type CalendarAccountRow = { id: string; provider: string; label: string; email: string; status: string; isActive: boolean };
export type CalendarCompanySetting = { id: string; name: string; accountId: string | null; isEnabled: boolean; showCentralized: boolean };

const providerLabels: Record<string, string> = { google: "Google Calendar", microsoft: "Microsoft Outlook", other: "Otra cuenta" };
const connectionMessages: Record<string, { text: string; error: boolean }> = {
  connected: { text: "Google Calendar se conectó. El refresh token quedó cifrado en el servidor.", error: false },
  "microsoft-connected": { text: "Microsoft Outlook se conectó. El refresh token quedó cifrado en el servidor.", error: false },
  "microsoft-not-configured": { text: "Falta configurar las variables OAuth de Microsoft en el servidor.", error: true },
  "microsoft-invalid-state": { text: "La solicitud OAuth de Microsoft venció o no coincide. Inicia la conexión nuevamente.", error: true },
  "microsoft-cancelled": { text: "Se canceló la autorización de Microsoft.", error: true },
  "microsoft-failed": { text: "No se pudo conectar Microsoft Outlook. Revisa la configuración OAuth y el permiso Calendars.Read.", error: true },
  cancelled: { text: "Se canceló la autorización de Google.", error: true },
  "not-configured": { text: "Falta configurar las variables OAuth de Google en el servidor.", error: true },
  "invalid-state": { text: "La solicitud OAuth venció o no coincide. Inicia la conexión nuevamente.", error: true },
  "missing-scope": { text: "Google no concedió el permiso de lectura de eventos. Vuelve a autorizarlo.", error: true },
  failed: { text: "No se pudo conectar Google Calendar. Revisa la configuración OAuth y vuelve a intentar.", error: true },
  "sync-disabled": { text: "Esta instalación tiene desactivadas las consultas a proveedores. Activa el modo Origen en Configuración para conectar o sincronizar cuentas.", error: true },
};

function companySettingsChanged(current: CalendarCompanySetting, initial: CalendarCompanySetting[]) {
  const saved = initial.find((item) => item.id === current.id);
  return !saved || saved.accountId !== current.accountId || saved.isEnabled !== current.isEnabled || saved.showCentralized !== current.showCentralized;
}

export function CalendarSettingsPanel({ userId, initialAccounts, initialDestinationId, initialCompanies, initialConnectionResult, syncMode }: { userId: string; initialAccounts: CalendarAccountRow[]; initialDestinationId: string | null; initialCompanies: CalendarCompanySetting[]; initialConnectionResult: string | null; syncMode: CalendarSyncMode }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [companies, setCompanies] = useState(initialCompanies);
  const [savedCompanies, setSavedCompanies] = useState(initialCompanies);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [provider, setProvider] = useState("google");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const initialNotice = initialConnectionResult ? connectionMessages[initialConnectionResult] : undefined;
  const [message, setMessage] = useState(initialNotice?.text ?? "");
  const [isError, setIsError] = useState(initialNotice?.error ?? false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncSeverity, setSyncSeverity] = useState<"success" | "warning" | "error">("success");

  useEffect(() => {
    if (!initialConnectionResult) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [initialConnectionResult]);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile/calendar/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, label, email }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.account) {
        setIsError(true);
        setMessage(result?.error ?? "No se pudo registrar la cuenta.");
        return;
      }
      setAccounts((current) => [...current, result.account].sort((a, b) => a.label.localeCompare(b.label, "es")));
      setLabel("");
      setEmail("");
      setCreateOpen(false);
      setIsError(false);
      setMessage("Cuenta registrada. Todavía no está conectada a su proveedor.");
    } catch {
      setIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  async function setDestination(accountId: string) {
    setDestinationId(accountId);
    setMessage("");
    const response = await fetch("/api/profile/calendar/destination", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId }) });
    if (!response.ok) {
      setIsError(true);
      setMessage("No se pudo guardar la cuenta destino.");
      return;
    }
    setIsError(false);
    setMessage("Cuenta destino actualizada.");
  }

  async function saveCompany(company: CalendarCompanySetting) {
    if (pendingCompanyId) return;
    setPendingCompanyId(company.id);
    setMessage("");
    try {
      const response = await fetch(`/api/profile/calendar/companies/${company.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: company.accountId, isEnabled: company.isEnabled, showCentralized: company.showCentralized }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setIsError(true);
        setMessage(result?.error ?? "No se pudo guardar la configuración de la empresa.");
        return;
      }
      setSavedCompanies((current) => current.map((item) => item.id === company.id ? { ...company } : item));
      setIsError(false);
      setMessage(`Configuración de ${company.name} actualizada.`);
    } catch {
      setIsError(true);
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPendingCompanyId(null);
    }
  }

  async function syncCalendar(company: CalendarCompanySetting, view: "company" | "centralized") {
    const key = view === "company" ? `company:${company.id}` : "centralized";
    if (syncingKey || pendingCompanyId) return;
    setSyncingKey(key);
    setSyncMessage("");
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId: company.id, view }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.run || result.run.status === "error") {
        setSyncSeverity("error");
        setSyncMessage(result?.error ?? result?.run?.errorMessage ?? "No se pudo sincronizar Google Calendar.");
        return;
      }
      const cooldownKey = `calendar-auto-sync:${userId}:${view}:${view === "company" ? company.id : "central"}`;
      window.localStorage.setItem(cooldownKey, String(Date.now()));
      const failures = (result.results ?? []).filter((item: { status: string }) => item.status === "error") as Array<{ companyName: string; errorMessage: string | null }>;
      const skipped = (result.skipped ?? []) as Array<{ companyName: string; reason: string }>;
      const warning = result.run.status === "partial";
      setSyncSeverity(failures.length ? "error" : warning ? "warning" : "success");
      const scope = view === "centralized" ? `: ${result.run.accountCount ?? 0} cuenta(s) Google, ${result.run.companyCount ?? 0} empresa(s)` : ` para ${company.name}`;
      const failureText = failures.length ? ` Errores: ${failures.map((item) => `${item.companyName}: ${item.errorMessage}`).join("; ")}.` : "";
      const skippedText = skipped.length ? ` Omitidas: ${skipped.map((item) => `${item.companyName}: ${item.reason}`).join("; ")}.` : "";
      setSyncMessage(view === "centralized"
        ? `Sincronización centralizada ${warning ? "parcial" : "completada"}${scope}; ${result.run.fetchedEvents} eventos consultados y ${result.run.apiRequests} solicitud(es) a Google.${failureText}${skippedText}`
        : `Sincronización ${warning ? "parcial" : "completada"}${scope}: ${result.run.fetchedEvents} eventos consultados y ${result.run.apiRequests} solicitud(es) a Google.${failureText}`);
    } catch {
      setSyncSeverity("error");
      setSyncMessage("No se pudo conectar para sincronizar. Vuelve a intentarlo.");
    } finally {
      setSyncingKey(null);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <ModuleHeader title="Configuración de calendario" description="Conecta tus cuentas, define una cuenta destino y decide en qué empresas estará disponible la vista centralizada." action={<div className="flex flex-wrap items-center gap-2">{syncMode === "origin" && <><ButtonLink href="/api/calendar/google/connect" variant="primary">Conectar Google</ButtonLink><ButtonLink href="/api/calendar/microsoft/connect" variant="secondary">Conectar Outlook</ButtonLink></>}<CreateDialog title="Registrar cuenta" triggerLabel="Registrar cuenta" open={createOpen} onOpenChange={setCreateOpen} busy={pending}>
        <form onSubmit={createAccount} className="space-y-4">
          <label className="block text-sm font-medium">Proveedor
            <select value={provider} onChange={(event) => setProvider(event.target.value)} className="ui-field mt-1 block"><option value="google">Google Calendar</option><option value="microsoft">Microsoft Outlook</option><option value="other">Otra cuenta</option></select>
          </label>
          <label className="block text-sm font-medium">Nombre de referencia
            <input value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={80} className="ui-field mt-1 block" placeholder="Ej. Correo empresa A" />
          </label>
          <label className="block text-sm font-medium">Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="ui-field mt-1 block" placeholder="correo@empresa.com" />
          </label>
          <Button variant="primary" loading={pending}>{pending ? "Guardando…" : "Registrar cuenta"}</Button>
        </form>
      </CreateDialog></div>} />

      {message && <p role={isError ? "alert" : "status"} className={`text-sm ${isError ? "text-danger" : "text-success"}`}>{message}</p>}
      {syncMode === "disabled" && <p role="status" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">Las llamadas a Google y Outlook están desactivadas en esta instalación. Puedes revisar y preparar la configuración, pero no conectar ni sincronizar proveedores.</p>}

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Cuentas registradas</h2><p className="mt-1 text-sm text-muted">Google Calendar y Microsoft Outlook se conectan por OAuth para lectura; otros proveedores se anotan manualmente.</p></div><span className="text-xs text-subtle">{accounts.length} cuenta{accounts.length === 1 ? "" : "s"}</span></div>
        <div className="mt-4 space-y-2">
          {accounts.length === 0 ? <p className="text-sm text-muted">Aún no has conectado cuentas.</p> : accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-strong"><UiIcon name="calendar" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{account.label}</span><span className="block truncate text-xs text-muted">{account.email} · {providerLabels[account.provider] ?? "Otra cuenta"}</span></span><span className={`text-[11px] ${account.status === "connected" ? "text-success" : "text-warning"}`}>{account.status === "connected" ? "Conectada" : "Registro manual"}</span></div>)}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Cuenta destino</h2>
        <p className="mt-1 text-sm text-muted">Esta cuenta se incluye como fuente personal en la vista centralizada, además de los calendarios habilitados por empresa. Para leer sus eventos debe estar conectada con Google OAuth.</p>
        <select value={destinationId ?? ""} onChange={(event) => { if (event.target.value) void setDestination(event.target.value); }} className="ui-field mt-4 block max-w-xl" disabled={!accounts.length}>
          <option value="">Selecciona una cuenta destino</option>
          {accounts.filter((account) => account.isActive).map((account) => <option key={account.id} value={account.id}>{account.label} · {account.email}</option>)}
        </select>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Calendario por empresa</h2><p className="mt-1 text-sm text-muted">Selecciona las cuentas origen. La sincronización centralizada consulta todas las empresas habilitadas; la estrella controla dónde aparece la vista.</p></div>{syncMode === "origin" && companies.find((company) => company.showCentralized) && <Button type="button" variant="secondary" size="compact" loading={syncingKey === "centralized"} disabled={syncingKey !== null || pendingCompanyId !== null || companies.some((company) => company.showCentralized && companySettingsChanged(company, savedCompanies))} onClick={() => { const target = companies.find((company) => company.showCentralized); if (target) void syncCalendar(target, "centralized"); }}><UiIcon name="calendar" className="h-3.5 w-3.5" />{syncingKey === "centralized" ? "Sincronizando…" : "Sincronizar centralizado"}</Button>}</div>
        {syncMessage && <p role={syncSeverity === "error" ? "alert" : "status"} className={`mt-3 text-sm ${syncSeverity === "error" ? "text-danger" : syncSeverity === "warning" ? "text-warning" : "text-success"}`}>{syncMessage}</p>}
        <div className="mt-4 space-y-3">
          {companies.length === 0 ? <p className="text-sm text-muted">No tienes empresas activas.</p> : companies.map((company) => { const account = accounts.find((item) => item.id === company.accountId); const canSync = syncMode === "origin" && !companySettingsChanged(company, savedCompanies) && company.isEnabled && (account?.provider === "google" || account?.provider === "microsoft") && account.status === "connected" && account.isActive; return <div key={company.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)_auto_auto] sm:items-center"><div><p className="text-sm font-semibold text-ink">{company.name}</p><p className="mt-0.5 text-xs text-muted">Calendario propio de la empresa</p></div><select value={company.accountId ?? ""} onChange={(event) => setCompanies((current) => current.map((item) => item.id === company.id ? { ...item, accountId: event.target.value || null } : item))} className="ui-field !mt-0"><option value="">Sin cuenta origen</option>{accounts.filter((account) => account.isActive).map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={company.isEnabled} onChange={(event) => setCompanies((current) => current.map((item) => item.id === company.id ? { ...item, isEnabled: event.target.checked } : item))} className="h-4 w-4 accent-[var(--action-primary)]" /> Habilitado</label><div className="flex flex-wrap items-center gap-2"><Button type="button" variant={company.showCentralized ? "primary" : "secondary"} size="icon" title={company.showCentralized ? "Vista centralizada habilitada" : "Habilitar vista centralizada"} aria-label={company.showCentralized ? `Desactivar calendario centralizado en ${company.name}` : `Activar calendario centralizado en ${company.name}`} onClick={() => setCompanies((current) => current.map((item) => item.id === company.id ? { ...item, showCentralized: !item.showCentralized, isEnabled: item.showCentralized ? item.isEnabled : true } : item))}><UiIcon name="star" className="h-4 w-4" /></Button>{syncMode === "origin" && <Button type="button" variant="secondary" size="compact" loading={syncingKey === `company:${company.id}`} disabled={!canSync || syncingKey !== null || pendingCompanyId !== null} title={canSync ? `Sincronizar calendario de ${company.name}` : "Guarda los cambios y asigna una cuenta Google u Outlook conectada con el calendario habilitado"} onClick={() => void syncCalendar(company, "company")}><UiIcon name="calendar" className="h-3.5 w-3.5" />{syncingKey === `company:${company.id}` ? "Sincronizando…" : "Sincronizar"}</Button>}<Button type="button" variant="secondary" size="compact" loading={pendingCompanyId === company.id} disabled={syncingKey !== null} onClick={() => void saveCompany(company)}>Guardar</Button></div></div>; })}
        </div>
      </section>
    </section>
  );
}
