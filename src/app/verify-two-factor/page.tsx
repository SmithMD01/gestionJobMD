import { TwoFactorForm } from "./two-factor-form";
import { ThemeToggle } from "../theme-toggle";

export default function VerifyTwoFactorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 self-end"><ThemeToggle /></div>
      <h1 className="text-3xl font-semibold">Segundo factor</h1>
      <p className="mt-2 text-muted">Ingresa el código de tu aplicación autenticadora o un código de recuperación.</p>
      <TwoFactorForm />
    </main>
  );
}
