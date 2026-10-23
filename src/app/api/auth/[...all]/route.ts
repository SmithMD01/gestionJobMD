import { toNextJsHandler } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { recordSecurityEvent } from "@/lib/security-audit";

const handlers = toNextJsHandler(auth);
const allowedAdminPaths = new Set([
  "/api/auth/admin/create-user",
  "/api/auth/admin/list-users",
  "/api/auth/admin/ban-user",
  "/api/auth/admin/unban-user",
]);
const guardedPaths = new Set([
  "/api/auth/change-password",
  "/api/auth/change-email",
  "/api/auth/forget-password",
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
  "/api/auth/two-factor/disable",
  "/api/auth/two-factor/generate-backup-codes",
]);

async function requireAdminWithTwoFactor(request: Request) {
  const path = new URL(request.url).pathname;
  if (guardedPaths.has(path)) {
    return Response.json({ error: "Operación no disponible en esta ruta" }, { status: 403 });
  }
  if (!path.startsWith("/api/auth/admin/")) return null;
  if (!allowedAdminPaths.has(path)) {
    return Response.json({ error: "Operación administrativa no disponible" }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return Response.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  return (await requireAdminWithTwoFactor(request)) ?? handlers.GET(request);
}

export async function POST(request: Request) {
  const denial = await requireAdminWithTwoFactor(request);
  if (denial) return denial;

  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/auth/admin/")) return handlers.POST(request);

  const session = await auth.api.getSession({ headers: request.headers });
  const data = (await request.clone().json().catch(() => ({}))) as { userId?: unknown; email?: unknown };
  const action = path.slice("/api/auth/admin/".length);
  const subject = typeof data.userId === "string" ? data.userId : null;

  try {
    await recordSecurityEvent(`admin.${action}.requested`, session!.user.id, subject);
  } catch {
    return Response.json({ error: "No se pudo registrar la operación" }, { status: 503 });
  }

  const response = await handlers.POST(request);
  if (response.ok) {
    let subjectId = subject;
    if (action === "create-user" && typeof data.email === "string") {
      const created = await db.query.user.findFirst({ where: eq(user.email, data.email.trim().toLowerCase()) });
      subjectId = created?.id ?? null;
    }
    try {
      await recordSecurityEvent(`admin.${action}.completed`, session!.user.id, subjectId);
    } catch (error) {
      console.error("Security audit completion failed", error);
    }
  }
  return response;
}
