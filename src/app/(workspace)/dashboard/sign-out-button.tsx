"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { UiIcon } from "@/app/ui-icon";
import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <Button variant="ghost" size={compact ? "icon" : "default"} onClick={async () => {
        try {
          const result = await authClient.signOut();
          if (result.error) { setError("No se pudo cerrar la sesión."); return; }
          router.replace("/sign-in");
          router.refresh();
        } catch { setError("No se pudo conectar."); }
      }} aria-label="Cerrar sesión" title={compact ? "Cerrar sesión" : undefined} className={compact ? "rounded-lg" : "w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm"}>
        <UiIcon name="logout" />
        {!compact && <span>Cerrar sesión</span>}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
