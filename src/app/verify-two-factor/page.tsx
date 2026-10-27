import { TwoFactorForm } from "./two-factor-form";

export default function VerifyTwoFactorPage() {
  return (
    <main className="login-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section aria-labelledby="two-factor-title" className="login-card w-full max-w-md rounded-2xl border border-line bg-surface px-6 py-8 shadow-[0_20px_70px_rgba(0,0,0,0.12)] sm:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-ink text-sm font-bold text-on-primary">MD</div>
          <div><p className="text-sm font-semibold text-ink">Gestión MD</p><p className="mt-0.5 text-xs text-subtle">Espacio de trabajo</p></div>
        </div>
        <h1 id="two-factor-title" className="text-2xl font-semibold text-ink sm:text-3xl">Verifica tu identidad</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Ingresa el código de tu aplicación autenticadora o un código de recuperación.</p>
        <TwoFactorForm />
      </section>
    </main>
  );
}
