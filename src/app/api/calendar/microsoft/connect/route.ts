import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMicrosoftAuthorizationUrl, getMicrosoftOAuthConfig } from "@/modules/calendar/microsoft-oauth";
import { isCalendarProviderSyncEnabled } from "@/modules/calendar/instance-config";

const stateCookieName = "microsoft_calendar_oauth_state";
const stateCookiePath = "/api/calendar/microsoft";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/sign-in", request.url));
  if (!await isCalendarProviderSyncEnabled()) return redirectToSettings(request, "sync-disabled");
  const config = getMicrosoftOAuthConfig();
  if (!config) return redirectToSettings(request, "microsoft-not-configured");

  const state = randomBytes(32).toString("base64url");
  const authorizationUrl = createMicrosoftAuthorizationUrl(config, state, session.user.email);
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(stateCookieName, `${state}:${session.user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: stateCookiePath,
    maxAge: 10 * 60,
  });
  return response;
}

function redirectToSettings(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/profile/calendar?calendarConnection=${result}`, request.url));
}
