import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";
import { ThemeToggle } from "../theme-toggle";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 self-end"><ThemeToggle /></div>
      <h1 className="text-3xl font-semibold text-ink">Iniciar sesión</h1>
      <p className="mt-2 text-muted">Solo los usuarios habilitados por el administrador pueden entrar.</p>
      <SignInForm />
    </main>
  );
}
