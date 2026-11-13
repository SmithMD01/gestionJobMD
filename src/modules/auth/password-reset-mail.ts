import "server-only";
import { z } from "zod";
import { db } from "@/db/client";
import { emailDeliveryLog } from "@/modules/mail/schema";

const tokenResponseSchema = z.object({ access_token: z.string().min(1) });
const EMAIL_TYPE = "password_reset";
const PROVIDER = "microsoft_graph";

class MailDeliveryError extends Error {}

function getGraphMailConfig() {
  const tenantId = process.env.MICROSOFT_GRAPH_MAIL_TENANT_ID?.trim();
  const clientId = process.env.MICROSOFT_GRAPH_MAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_GRAPH_MAIL_CLIENT_SECRET?.trim();
  const sender = process.env.MICROSOFT_GRAPH_MAIL_SENDER?.trim();
  if (!tenantId || !clientId || !clientSecret || !sender) return null;
  return { tenantId, clientId, clientSecret, sender };
}

export async function sendPasswordResetEmail(userId: string, email: string, url: string) {
  let status = "error";
  let detail = "No se pudo completar el envío por un error de conexión.";

  try {
    const config = getGraphMailConfig();
    if (!config) throw new MailDeliveryError("Falta configurar Microsoft Graph para el envío.");

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
        cache: "no-store",
      });
    } catch {
      throw new MailDeliveryError("No se pudo conectar con Microsoft Graph para solicitar acceso.");
    }
    const tokenData = tokenResponseSchema.safeParse(await tokenResponse.json().catch(() => null));
    if (!tokenResponse.ok || !tokenData.success) {
      throw new MailDeliveryError(`Microsoft Graph no emitió credenciales (HTTP ${tokenResponse.status}).`);
    }

    const message = [
      "Recibimos una solicitud para cambiar la contraseña de tu cuenta de Gestión MD.",
      "",
      "Usa este enlace para elegir una contraseña nueva. El enlace es de un solo uso y vence en 30 minutos:",
      url,
      "",
      "Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual no se modificará.",
    ].join("\n");
    let sendResponse: Response;
    try {
      sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.sender)}/sendMail`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenData.data.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: "Restablece tu contraseña de Gestión MD",
            body: { contentType: "Text", content: message },
            toRecipients: [{ emailAddress: { address: email } }],
          },
          saveToSentItems: false,
        }),
        cache: "no-store",
      });
    } catch {
      throw new MailDeliveryError("No se pudo conectar con Microsoft Graph para enviar el correo.");
    }
    if (!sendResponse.ok) {
      throw new MailDeliveryError(`Microsoft Graph rechazó el correo (HTTP ${sendResponse.status}).`);
    }
    status = "accepted";
    detail = "Microsoft Graph aceptó la solicitud de envío.";
  } catch (error) {
    if (error instanceof MailDeliveryError) detail = error.message;
  }

  try {
    await db.insert(emailDeliveryLog).values({
      recipientUserId: userId,
      recipientEmail: email,
      emailType: EMAIL_TYPE,
      provider: PROVIDER,
      status,
      detail,
    });
  } catch {
    console.error("Could not record the password reset email delivery status.");
  }

  if (status === "error") throw new Error("Password reset email delivery failed.");
}
