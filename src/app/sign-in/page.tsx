import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";
import { LoginWaveBackground } from "./login-wave-background";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="login-page relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <LoginWaveBackground />
      <section aria-labelledby="sign-in-title" className="login-card relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface/95 px-6 py-8 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-ink text-sm font-bold text-on-primary">MD</div>
          <div><p className="text-sm font-semibold text-ink">Gestión MD</p><p className="mt-0.5 text-xs text-subtle">Espacio de trabajo</p></div>
        </div>
        <h1 id="sign-in-title" className="text-2xl font-semibold text-ink sm:text-3xl">Bienvenido</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Ingresa con las credenciales asignadas por el administrador.</p>
        <SignInForm />
      </section>
    </main>
  );
}
