"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "@/lib/auth-client";

export function TotpSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function begin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await authClient.twoFactor.enable({ password, method: "totp" });
      if (result.error || !result.data || result.data.method !== "totp") {
        setError("No se pudo iniciar la configuración. Revisa tu contraseña.");
        return;
      }
      setUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setPassword("");
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError("El código no es válido o venció. Vuelve a intentarlo.");
        return;
      }
      setVerified(true);
    } catch {
      setError("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 p-6">
      {!uri ? (
        <form onSubmit={begin} className="space-y-4">
          <label className="block text-sm font-medium">Contraseña actual
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <button disabled={pending} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Generar código QR</button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="inline-block rounded-lg bg-white p-3"><QRCodeSVG value={uri} size={192} /></div>
          <p className="break-all text-xs text-slate-500">Si no puedes escanearlo, usa esta dirección: {uri}</p>
          {!verified ? (
            <form onSubmit={verify} className="space-y-3">
              <label className="block text-sm font-medium">Código de la aplicación
                <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <button disabled={pending} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Confirmar segundo factor</button>
            </form>
          ) : (
            <p role="status" className="font-medium text-green-800">Segundo factor activado. Guarda estos códigos antes de continuar.</p>
          )}
          {verified && backupCodes.length > 0 && (
            <div className="rounded-md bg-amber-50 p-4">
              <p className="font-medium">Códigos de recuperación de un solo uso</p>
              <ul className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {verified && <button onClick={() => { setUri(""); setBackupCodes([]); router.replace("/dashboard"); }} className="rounded-md bg-slate-900 px-4 py-2 text-white">Continuar</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
  );
}
