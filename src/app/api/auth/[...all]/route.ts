import { toNextJsHandler } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  clearSignInFailures,
  consumePasswordResetIpRequest,
  consumePasswordResetRequest,
  enforceAuthAbuseRetention,
  getRequestIp,
  getSignInProgressiveDelay,
  recordFailedSignIn,
  registeredEmail,
} from "@/lib/auth-abuse-protection";

const handlers = toNextJsHandler(auth);
const allowedAdminPaths = new Set([
  "/api/auth/admin/create-user",
  "/api/auth/admin/list-users",
  "/api/auth/admin/ban-user",
  "/api/auth/admin/unban-user",
  "/api/auth/admin/update-user",
]);
const guardedPaths = new Set([
  "/api/auth/change-password",
  "/api/auth/change-email",
  "/api/auth/forget-password",
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

const passwordResetMessage = "Si el correo está registrado, enviaremos un enlace.";

async function handleEmailSignIn(request: Request) {
  try { await enforceAuthAbuseRetention(); } catch { console.error("Could not clean expired auth throttling data."); }
  const body = (await request.clone().json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const ip = getRequestIp(request);
  const hasAccount = email ? await registeredEmail(email) : false;

  if (email) {
    const delay = await getSignInProgressiveDelay(email, ip, hasAccount);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  }

  const response = await handlers.POST(request);
  if (response.status === 401 && email) {
    try {
      await recordFailedSignIn(email, ip, hasAccount);
    } catch {
      console.error("Could not record a failed sign-in attempt.");
    }
  } else if (response.ok && email) {
    try {
      await clearSignInFailures(email, hasAccount);
    } catch {
      console.error("Could not clear successful sign-in attempt counters.");
    }
  }
  return response;
}

async function handlePasswordResetRequest(request: Request) {
  try { await enforceAuthAbuseRetention(); } catch { console.error("Could not clean expired auth throttling data."); }
  const body = (await request.clone().json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  try {
    const ipAllowed = await consumePasswordResetIpRequest(getRequestIp(request));
    if (!ipAllowed) return Response.json({ status: true, message: passwordResetMessage });
    const hasAccount = email ? await registeredEmail(email) : false;
    if (!hasAccount) {
      // Let Better Auth perform its dummy lookup and return its generic response for unknown addresses.
      await handlers.POST(request);
    } else if (await consumePasswordResetRequest(email)) {
      await handlers.POST(request);
    }
  } catch {
    console.error("Password reset request could not be processed.");
  }
  return Response.json({ status: true, message: passwordResetMessage });
}

export async function GET(request: Request) {
  return (await requireAdminWithTwoFactor(request)) ?? handlers.GET(request);
}

export async function POST(request: Request) {
  const denial = await requireAdminWithTwoFactor(request);
  if (denial) return denial;

  const path = new URL(request.url).pathname;
  if (path === "/api/auth/sign-in/email") return handleEmailSignIn(request);
  if (path === "/api/auth/request-password-reset") return handlePasswordResetRequest(request);
  if (path === "/api/auth/reset-password") return handlers.POST(request);
  if (!path.startsWith("/api/auth/admin/")) return handlers.POST(request);

  const session = await auth.api.getSession({ headers: request.headers });
  const data = (await request.clone().json().catch(() => ({}))) as { userId?: unknown; email?: unknown };
  const action = path.slice("/api/auth/admin/".length);
  if (action === "update-user") {
    const body = data as typeof data & { data?: unknown };
    const fields = body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? Object.keys(body.data as Record<string, unknown>) : [];
    const name = (body.data as { name?: unknown } | undefined)?.name;
    if (fields.length !== 1 || fields[0] !== "name" || typeof name !== "string" || !name.trim() || name.length > 100) {
      return Response.json({ error: "Solo se permite actualizar un nombre válido desde esta ruta" }, { status: 400 });
    }
  }
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
