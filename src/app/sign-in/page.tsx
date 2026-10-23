import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mt-2 text-slate-600">Solo los usuarios habilitados por el administrador pueden entrar.</p>
      <SignInForm />
    </main>
  );
}
