import { requireReadySession } from "@/lib/require-session";
import { companiesForUser } from "@/modules/companies/context";

export default async function DashboardPage() {
  const session = await requireReadySession();
  const companies = await companiesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium text-subtle">Inicio</p>
      <h1 className="mt-1 text-3xl font-semibold">Hola, {session.user.name}</h1>
      {companies.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-muted">Antes de crear proyectos, abre Empresas desde el menú y registra tu primera empresa.</p>
      ) : (
        <p className="mt-6 text-muted">Elige la empresa activa en la barra superior para consultar sus proyectos.</p>
      )}
    </main>
  );
}
