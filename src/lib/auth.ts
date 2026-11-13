import { config } from "dotenv";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins/admin";
import { twoFactor } from "better-auth/plugins/two-factor";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { getServerEnv } from "@/lib/env";
import { recordSecurityEvent } from "@/lib/security-audit";
import { sendPasswordResetEmail } from "@/modules/auth/password-reset-mail";

config({ path: ".env" });
const env = getServerEnv();

export const auth = betterAuth({
  appName: "Gestión del trabajo",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
          await sendPasswordResetEmail(user.id, user.email, url);
      } catch {
        console.error("Microsoft Graph could not deliver a password reset email.");
      }
    },
    onPasswordReset: async ({ user }) => {
      try {
        await recordSecurityEvent("password.reset.completed", user.id);
      } catch {
        console.error("Could not record the password reset security event.");
      }
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await recordSecurityEvent("session.created", session.userId);
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 10 },
      "/reset-password": { window: 60, max: 10 },
      "/two-factor/*": { window: 60, max: 5 },
    },
  },
  plugins: [admin(), twoFactor({ issuer: "Gestión del trabajo" }), nextCookies()],
});
