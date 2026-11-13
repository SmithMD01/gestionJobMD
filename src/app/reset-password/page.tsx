import Link from "next/link";
import { LoginWaveBackground } from "@/app/sign-in/login-wave-background";
import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, error } = await searchParams;
  const validLink = Boolean(token && !error);
  return (
    <main className="login-page relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <LoginWaveBackground />
      <section aria-labelledby="reset-password-title" className="login-card relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface/95 px-6 py-8 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-ink text-sm font-bold text-on-primary">MD</div>
          <div><p className="text-sm font-semibold text-ink">Gestión MD</p><p className="mt-0.5 text-xs text-subtle">Espacio de trabajo</p></div>
        </div>
        <h1 id="reset-password-title" className="text-2xl font-semibold text-ink">Crear nueva contraseña</h1>
        {validLink ? <ResetPasswordForm token={token!} /> : <>
          <p className="mt-2 text-sm leading-6 text-muted">El enlace no es válido o ya venció. Solicita otro para cambiar tu contraseña.</p>
          <Link href="/forgot-password" className="mt-7 inline-flex text-sm font-semibold text-primary underline underline-offset-4">Solicitar otro enlace</Link>
        </>}
      </section>
    </main>
  );
}
