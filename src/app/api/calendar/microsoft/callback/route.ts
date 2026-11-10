import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { calendarAccount } from "@/modules/calendar/schema";
import { exchangeMicrosoftAuthorizationCode, getMicrosoftOAuthConfig } from "@/modules/calendar/microsoft-oauth";
import { isCalendarProviderSyncEnabled } from "@/modules/calendar/instance-config";

const stateCookieName = "microsoft_calendar_oauth_state";
const stateCookiePath = "/api/calendar/microsoft";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const settingsUrl = new URL("/profile/calendar", request.url);
  const cookieState = request.cookies.get(stateCookieName)?.value;
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
  if (!await isCalendarProviderSyncEnabled()) return responseFor("sync-disabled");
  const [expectedState, initiatingUserId] = cookieState?.split(":", 2) ?? [];
  if (!expectedState || !initiatingUserId || initiatingUserId !== session.user.id || expectedState !== query.get("state")) return responseFor("microsoft-invalid-state");
  if (query.has("error")) return responseFor(query.get("error") === "access_denied" ? "microsoft-cancelled" : "microsoft-failed");
  const code = query.get("code");
  const config = getMicrosoftOAuthConfig();
  if (!code || !config) return responseFor(config ? "microsoft-failed" : "microsoft-not-configured");

  try {
    const credentials = await exchangeMicrosoftAuthorizationCode(code, config);
    const [existing] = await db.select({ id: calendarAccount.id, label: calendarAccount.label })
      .from(calendarAccount)
      .where(and(eq(calendarAccount.userId, session.user.id), eq(calendarAccount.provider, "microsoft"), eq(calendarAccount.email, credentials.email)))
      .limit(1);

    await db.insert(calendarAccount).values({
      userId: session.user.id,
      provider: "microsoft",
      label: existing?.label ?? "Microsoft Outlook",
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
        status: "connected",
        isActive: true,
        refreshTokenEncrypted: credentials.encryptedRefreshToken,
        tokenExpiresAt: credentials.expiresAt,
        grantedScopes: credentials.scopes,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return responseFor("microsoft-connected");
  } catch {
    return responseFor("microsoft-failed");
  }
}
