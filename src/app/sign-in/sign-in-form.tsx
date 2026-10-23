"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (result.error) {
        setError(result.error.status === 429 ? "Demasiados intentos. Espera un momento." : "No se pudo iniciar sesión. Revisa tus datos.");
      } else if (!result.data || !("twoFactorRedirect" in result.data && result.data.twoFactorRedirect)) {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Correo
        <input name="email" type="email" autoComplete="username" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">
        {pending ? "Comprobando…" : "Entrar"}
      </button>
    </form>
  );
}
