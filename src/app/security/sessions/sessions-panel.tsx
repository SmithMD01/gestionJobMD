"use client";

import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

type SessionItem = { token: string; createdAt: Date; userAgent?: string | null; ipAddress?: string | null };

export function SessionsPanel({ initialSessions }: { initialSessions: SessionItem[] }) {
  const [items, setItems] = useState<SessionItem[]>(initialSessions);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await authClient.listSessions();
      if (result.data) setItems(result.data);
      else setMessage("No se pudieron cargar las sesiones.");
    } catch {
      setMessage("No se pudieron cargar las sesiones.");
    }
  }, []);

  async function revokeOthers() {
    try {
      const result = await authClient.revokeOtherSessions();
      setMessage(result.error ? "No se pudieron cerrar las otras sesiones." : "Otras sesiones cerradas.");
    } catch {
      setMessage("No se pudieron cerrar las otras sesiones.");
    }
    await load();
  }

  return (
    <section className="mt-8 space-y-4">
      <button onClick={revokeOthers} className="rounded-md bg-slate-900 px-4 py-2 text-white">Cerrar las otras sesiones</button>
      {message && <p role="status" className="text-sm">{message}</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.token} className="rounded-md border border-slate-200 p-4 text-sm">
            <p className="font-medium">{item.userAgent || "Dispositivo desconocido"}</p>
            <p className="text-slate-600">{item.ipAddress || "IP no disponible"} · Desde {new Date(item.createdAt).toLocaleString("es-PE")}</p>
            <button onClick={async () => {
              try {
                const result = await authClient.revokeSession({ token: item.token });
                setMessage(result.error ? "No se pudo cerrar la sesión." : "Sesión cerrada.");
              } catch { setMessage("No se pudo cerrar la sesión."); }
              await load();
            }} className="mt-2 text-red-700 underline">Cerrar esta sesión</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
