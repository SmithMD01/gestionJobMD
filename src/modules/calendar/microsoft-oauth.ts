import "server-only";
import { z } from "zod";
import { decryptSecret, encryptSecret, getCalendarTokenEncryptionKey } from "./google-oauth";
import { normalizeCalendarDescription } from "./description";

export const MICROSOFT_CALENDAR_SCOPES = ["openid", "profile", "email", "offline_access", "User.Read", "Calendars.Read"] as const;
const graphBaseUrl = "https://graph.microsoft.com/v1.0";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});

const profileSchema = z.object({
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().min(1),
});

const graphEmailSchema = z.object({ address: z.string().email().optional(), name: z.string().optional() }).optional();
const graphEventSchema = z.object({
  id: z.string().min(1),
  subject: z.string().nullable().optional(),
  bodyPreview: z.string().nullable().optional(),
  body: z.object({ content: z.string().optional() }).nullable().optional(),
  start: z.object({ dateTime: z.string(), timeZone: z.string().optional() }).optional(),
  end: z.object({ dateTime: z.string(), timeZone: z.string().optional() }).optional(),
  isAllDay: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  attendees: z.array(z.object({ emailAddress: graphEmailSchema, status: z.object({ response: z.string().optional() }).optional() })).optional(),
  organizer: z.object({ emailAddress: graphEmailSchema }).optional(),
});
const graphPageSchema = z.object({ value: z.array(graphEventSchema).default([]), "@odata.nextLink": z.string().url().optional() });

export type MicrosoftCalendarEvent = z.infer<typeof graphEventSchema>;

export function getMicrosoftOAuthConfig() {
  const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET?.trim();
  const tenantId = process.env.MICROSOFT_CALENDAR_TENANT_ID?.trim();
  const tokenKey = getCalendarTokenEncryptionKey();
  const redirectUri = process.env.MICROSOFT_CALENDAR_REDIRECT_URI?.trim()
    || `${process.env.BETTER_AUTH_URL?.replace(/\/$/, "")}/api/calendar/microsoft/callback`;

  if (!clientId || !clientSecret || !tenantId || !tokenKey || !redirectUri || redirectUri.includes("undefined")) return null;
  if (!/^(common|organizations|consumers|[a-zA-Z0-9.-]+)$/.test(tenantId)) return null;
  return { clientId, clientSecret, tenantId, tokenKey, redirectUri };
}

export function createMicrosoftAuthorizationUrl(config: NonNullable<ReturnType<typeof getMicrosoftOAuthConfig>>, state: string, loginHint?: string) {
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url;
}

export async function exchangeMicrosoftAuthorizationCode(code: string, config: NonNullable<ReturnType<typeof getMicrosoftOAuthConfig>>) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_CALENDAR_SCOPES.join(" "),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Microsoft no pudo completar la autorización.");
  const tokens = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!tokens.success || !tokens.data.refresh_token) throw new Error("Microsoft no devolvió una autorización renovable.");
  if (!tokens.data.scope?.split(/\s+/).some((scope) => scope.split("/").at(-1)?.toLowerCase() === "calendars.read")) throw new Error("Microsoft no concedió el permiso Calendars.Read.");

  const profileResponse = await fetch(`${graphBaseUrl}/me?$select=mail,userPrincipalName`, {
    headers: { authorization: `Bearer ${tokens.data.access_token}` },
    cache: "no-store",
  });
  if (!profileResponse.ok) throw new Error("No se pudo verificar el correo autorizado de Microsoft.");
  const profile = profileSchema.safeParse(await profileResponse.json().catch(() => null));
  if (!profile.success) throw new Error("Microsoft devolvió un perfil sin correo válido.");
  const email = z.string().email().safeParse((profile.data.mail || profile.data.userPrincipalName).toLowerCase());
  if (!email.success) throw new Error("Microsoft no devolvió un correo válido para la cuenta.");
  return {
    email: email.data,
    encryptedRefreshToken: encryptSecret(tokens.data.refresh_token, config.tokenKey),
    expiresAt: new Date(Date.now() + tokens.data.expires_in * 1000),
    scopes: tokens.data.scope ?? MICROSOFT_CALENDAR_SCOPES.join(" "),
  };
}

export async function refreshMicrosoftAccessToken(encryptedRefreshToken: string, config: NonNullable<ReturnType<typeof getMicrosoftOAuthConfig>>) {
  const refreshToken = decryptSecret(encryptedRefreshToken, config.tokenKey);
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: MICROSOFT_CALENDAR_SCOPES.join(" "),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 400 || response.status === 401
    ? "La autorización de Microsoft venció o fue revocada. Reconecta la cuenta."
    : "No se pudo renovar la autorización de Microsoft.");
  const tokens = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!tokens.success) throw new Error("Microsoft devolvió una respuesta de renovación incompleta.");
  return {
    accessToken: tokens.data.access_token,
    expiresAt: new Date(Date.now() + tokens.data.expires_in * 1000),
    encryptedRefreshToken: tokens.data.refresh_token ? encryptSecret(tokens.data.refresh_token, config.tokenKey) : encryptedRefreshToken,
  };
}

export async function listMicrosoftCalendarEventsPage(accessToken: string, options: { timeMin: string; timeMax: string; nextLink?: string }) {
  const url = options.nextLink ? new URL(options.nextLink) : new URL(`${graphBaseUrl}/me/calendarView`);
  if (url.origin !== "https://graph.microsoft.com" || !url.pathname.startsWith("/v1.0/")) throw new Error("Microsoft devolvió un enlace de paginación no válido.");
  if (!options.nextLink) {
    url.searchParams.set("startDateTime", options.timeMin);
    url.searchParams.set("endDateTime", options.timeMax);
    url.searchParams.set("$select", "id,subject,body,bodyPreview,start,end,isAllDay,isCancelled,attendees,organizer");
    url.searchParams.set("$top", "1000");
  }
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 401
    ? "Microsoft rechazó la autorización. Reconecta la cuenta e intenta de nuevo."
    : response.status === 403 || response.status === 429
      ? "Microsoft limitó temporalmente las solicitudes. Espera un momento antes de sincronizar de nuevo."
      : "No se pudieron consultar los eventos de Outlook.");
  const parsed = graphPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("Microsoft devolvió una página de eventos con formato inesperado.");
  return { items: parsed.data.value, nextLink: parsed.data["@odata.nextLink"] };
}

export function microsoftEventDate(value?: { dateTime: string; timeZone?: string }) {
  if (!value) return null;
  const source = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.dateTime) ? value.dateTime : `${value.dateTime}Z`;
  const date = new Date(source);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function microsoftEventDescription(event: MicrosoftCalendarEvent) {
  const content = event.body?.content?.trim();
  if (!content) return normalizeCalendarDescription(event.bodyPreview ?? "");
  const withLinks = content.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_anchor, attributes: string, label: string) => {
    const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2]?.replace(/&amp;/gi, "&").trim();
    const text = label.replace(/<[^>]*>/g, "").trim();
    if (!href || !/^https?:\/\//i.test(href)) return text;
    return text && text.toLocaleLowerCase() !== href.toLocaleLowerCase() ? `${text}: ${href}` : href;
  });
  const plainText = withLinks
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(?:div|p|li|tr|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  return normalizeCalendarDescription(plainText);
}
