"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <button onClick={async () => {
        try {
          const result = await authClient.signOut();
          if (result.error) { setError("No se pudo cerrar la sesión."); return; }
          router.replace("/sign-in");
          router.refresh();
        } catch { setError("No se pudo conectar."); }
      }} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Cerrar sesión</button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
