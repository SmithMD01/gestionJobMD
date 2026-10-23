import { z } from "zod";
import { auth } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/security-audit";

const inputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
  totpCode: z.string().regex(/^\d{6}$/),
});

function authRequest(source: Request, path: string, body: object) {
  const requestHeaders = new Headers(source.headers);
  requestHeaders.delete("content-length");
  requestHeaders.set("content-type", "application/json");
  return new Request(new URL(path, source.url), {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!session.user.twoFactorEnabled) return Response.json({ error: "Configura el segundo factor primero" }, { status: 403 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const verification = await auth.handler(authRequest(request, "/api/auth/two-factor/verify-totp", { code: parsed.data.totpCode }));
  if (!verification.ok) {
    return Response.json({ error: verification.status === 429 ? "Demasiados intentos" : "Segundo factor no válido" }, { status: verification.status === 429 ? 429 : 403 });
  }

  try {
    await recordSecurityEvent("password.change.requested", session.user.id);
  } catch {
    return Response.json({ error: "No se pudo registrar la operación" }, { status: 503 });
  }

  const changed = await auth.handler(authRequest(request, "/api/auth/change-password", {
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: true,
  }));
  if (!changed.ok) {
    return Response.json({ error: "No se pudo cambiar la contraseña. Revisa tu contraseña actual." }, { status: changed.status === 429 ? 429 : 400 });
  }

  try {
    await recordSecurityEvent("password.change.completed", session.user.id);
  } catch (error) {
    console.error("Security audit completion failed", error);
  }

  return Response.json({ ok: true });
}
