"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { UiIcon } from "@/app/ui-icon";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
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
      }} aria-label="Cerrar sesión" title={compact ? "Cerrar sesión" : undefined} className={compact ? "flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink" : "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-hover hover:text-ink"}>
        <UiIcon name="logout" />
        {!compact && <span>Cerrar sesión</span>}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
