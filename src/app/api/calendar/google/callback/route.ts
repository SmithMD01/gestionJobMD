import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { calendarAccount } from "@/modules/calendar/schema";
import { exchangeGoogleAuthorizationCode, getGoogleOAuthConfig } from "@/modules/calendar/google-oauth";

const stateCookieName = "google_calendar_oauth_state";
const stateCookiePath = "/api/calendar/google";
const calendarEventsScope = "https://www.googleapis.com/auth/calendar.events.readonly";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/profile/calendar", request.url);
  const cookieState = request.cookies.get(stateCookieName)?.value;
  const query = request.nextUrl.searchParams;
  const responseFor = (result: string) => {
    const response = NextResponse.redirect(new URL(`${settingsUrl.pathname}?calendarConnection=${result}`, request.url));
    response.cookies.set(stateCookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: stateCookiePath,
      maxAge: 0,
    });
    return response;
  };

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/sign-in", request.url));
  const [expectedState, initiatingUserId] = cookieState?.split(":", 2) ?? [];
  if (!expectedState || !initiatingUserId || initiatingUserId !== session.user.id || expectedState !== query.get("state")) return responseFor("invalid-state");
  if (query.has("error")) return responseFor(query.get("error") === "access_denied" ? "cancelled" : "failed");
  const code = query.get("code");
  const config = getGoogleOAuthConfig();
  if (!code || !config) return responseFor(config ? "failed" : "not-configured");

  try {
    const credentials = await exchangeGoogleAuthorizationCode(code, config);
    const scopes = credentials.scopes.split(/\s+/);
    if (!scopes.includes(calendarEventsScope)) return responseFor("missing-scope");

    const [existing] = await db.select({ id: calendarAccount.id, label: calendarAccount.label })
      .from(calendarAccount)
      .where(and(eq(calendarAccount.userId, session.user.id), eq(calendarAccount.provider, "google"), eq(calendarAccount.email, credentials.email)))
      .limit(1);

    await db.insert(calendarAccount).values({
      userId: session.user.id,
      provider: "google",
      label: existing?.label ?? "Google Calendar",
      email: credentials.email,
      status: "connected",
      isActive: true,
      refreshTokenEncrypted: credentials.encryptedRefreshToken,
      tokenExpiresAt: credentials.expiresAt,
      grantedScopes: credentials.scopes,
      connectedAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [calendarAccount.userId, calendarAccount.provider, calendarAccount.email],
      set: {
        provider: "google",
        status: "connected",
        isActive: true,
        refreshTokenEncrypted: credentials.encryptedRefreshToken,
        tokenExpiresAt: credentials.expiresAt,
        grantedScopes: credentials.scopes,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return responseFor("connected");
  } catch {
    return responseFor("failed");
  }
}
