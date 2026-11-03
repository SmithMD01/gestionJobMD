import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.readonly",
] as const;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});

const googleUserSchema = z.object({
  email: z.string().email(),
  email_verified: z.boolean(),
});

const accessTokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().int().positive() });
const eventDateSchema = z.object({ dateTime: z.string().optional(), date: z.string().optional() });
const eventAttendeeSchema = z.object({
  email: z.string().optional(),
  displayName: z.string().optional(),
  responseStatus: z.string().optional(),
  organizer: z.boolean().optional(),
});
const googleEventSchema = z.object({
  id: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  start: eventDateSchema.optional(),
  end: eventDateSchema.optional(),
  attendees: z.array(eventAttendeeSchema).optional(),
  attendeesOmitted: z.boolean().optional(),
  updated: z.string().optional(),
});
const eventPageSchema = z.object({
  items: z.array(googleEventSchema).default([]),
  nextPageToken: z.string().optional(),
});

export type GoogleCalendarEvent = z.infer<typeof googleEventSchema>;

export type GoogleCalendarTokens = {
  encryptedRefreshToken: string;
  expiresAt: Date;
  scopes: string;
  email: string;
};

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const tokenKey = getCalendarTokenEncryptionKey();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
    || `${process.env.BETTER_AUTH_URL?.replace(/\/$/, "")}/api/calendar/google/callback`;

  if (!clientId || !clientSecret || !tokenKey || !redirectUri || redirectUri.includes("undefined")) return null;
  try {
    getEncryptionKey(tokenKey);
  } catch {
    return null;
  }
  return { clientId, clientSecret, tokenKey, redirectUri };
}

export function getCalendarTokenEncryptionKey() {
  const tokenKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!tokenKey) return null;
  try {
    getEncryptionKey(tokenKey);
    return tokenKey;
  } catch {
    return null;
  }
}

export function createGoogleAuthorizationUrl(clientId: string, redirectUri: string, state: string, loginHint?: string) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url;
}

export async function exchangeGoogleAuthorizationCode(code: string, config: NonNullable<ReturnType<typeof getGoogleOAuthConfig>>) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google no pudo completar la autorización.");
  const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("Google devolvió una respuesta de autorización incompleta.");

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${parsed.data.access_token}` },
    cache: "no-store",
  });
  if (!profileResponse.ok) throw new Error("No se pudo verificar el correo autorizado de Google.");
  const profile = googleUserSchema.safeParse(await profileResponse.json().catch(() => null));
  if (!profile.success || !profile.data.email_verified) throw new Error("Google no confirmó el correo de la cuenta.");
  if (!parsed.data.refresh_token) throw new Error("Google no entregó un refresh token. Revoca el acceso previo de esta aplicación y vuelve a conectarla.");

  return {
    encryptedRefreshToken: encryptSecret(parsed.data.refresh_token, config.tokenKey),
    expiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
    scopes: parsed.data.scope ?? GOOGLE_CALENDAR_SCOPES.join(" "),
    email: profile.data.email.toLowerCase(),
  } satisfies GoogleCalendarTokens;
}

export async function refreshGoogleAccessToken(refreshToken: string, config: NonNullable<ReturnType<typeof getGoogleOAuthConfig>>) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 400 || response.status === 401
    ? "La autorización de Google venció o fue revocada. Reconecta la cuenta."
    : "No se pudo renovar la autorización de Google.");
  const parsed = accessTokenSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("Google devolvió una respuesta de renovación incompleta.");
  return parsed.data.access_token;
}

export async function listGoogleCalendarEventsPage(accessToken: string, options: { timeMin: string; timeMax: string; pageToken?: string }) {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", options.timeMin);
  url.searchParams.set("timeMax", options.timeMax);
  url.searchParams.set("timeZone", "America/Lima");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  url.searchParams.set("maxResults", "2500");
  if (options.pageToken) url.searchParams.set("pageToken", options.pageToken);

  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401
    ? "Google rechazó la autorización. Reconecta la cuenta e intenta de nuevo."
    : response.status === 403 || response.status === 429
      ? "Google limitó temporalmente las solicitudes. Espera un momento antes de sincronizar de nuevo."
      : "No se pudieron consultar los eventos de Google Calendar.");
  const parsed = eventPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("Google devolvió una página de eventos con formato inesperado.");
  return parsed.data;
}

export function encryptSecret(value: string, encodedKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value: string, encodedKey: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra.length) throw new Error("Formato de credencial cifrada no válido.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(encodedKey), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
}

function getEncryptionKey(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== encodedKey.replace(/=+$/, "")) {
    throw new Error("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY debe ser Base64 de exactamente 32 bytes.");
  }
  return key;
}
