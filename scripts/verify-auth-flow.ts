import "dotenv/config";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { config } from "dotenv";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { account, user } from "../src/db/auth-schema";
import { securityEvent } from "../src/db/schema";

config({ path: ".env" });

const baseURL = process.env.BETTER_AUTH_URL;
const databaseURL = process.env.DATABASE_URL;

if (process.env.AUTH_FLOW_TEST !== "1" || baseURL !== "http://localhost:3000" || !databaseURL?.includes("@127.0.0.1:5433/gestion_job")) {
  throw new Error("This test runs only against the local development database with AUTH_FLOW_TEST=1");
}

function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let bitCount = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/, "")) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid TOTP secret");
    bits = (bits << 5) | digit;
    bitCount += 5;
    if (bitCount >= 8) {
      bitCount -= 8;
      output.push((bits >>> bitCount) & 0xff);
    }
  }
  return Buffer.from(output);
}

function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret");
  if (!secret) throw new Error("TOTP URI lacks a secret");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

async function main() {
  const adminId = randomUUID();
  const email = `phase1-${adminId}@example.invalid`;
  const childEmail = `child-${adminId}@example.invalid`;
  const password = randomBytes(24).toString("hex");
  const cookieJar = new Map<string, string>();

  async function request(path: string, body?: object) {
    const response = await fetch(new URL(path, baseURL), {
      method: body ? "POST" : "GET",
      headers: {
        origin: baseURL!,
        ...(body ? { "content-type": "application/json" } : {}),
        cookie: Array.from(cookieJar, ([key, value]) => `${key}=${value}`).join("; "),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    for (const item of response.headers.getSetCookie()) {
      const [pair] = item.split(";");
      const separator = pair.indexOf("=");
      if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const payload = await response.json().catch(() => null);
    return { status: response.status, payload };
  }

  await db.insert(user).values({ id: adminId, name: "Phase 1 test", email, emailVerified: true, role: "admin" });
  try {
    await db.insert(account).values({ id: randomUUID(), accountId: adminId, providerId: "credential", userId: adminId, password: await hashPassword(password) });

    const signIn = await request("/api/auth/sign-in/email", { email, password });
    if (signIn.status !== 200) throw new Error(`Sign-in failed: ${signIn.status}`);

    const before = await request("/api/auth/admin/list-users");
    if (before.status !== 403) throw new Error(`Admin access before TOTP should be 403, got ${before.status}`);
    const beforePage = await request("/users");
    if (beforePage.status !== 307) throw new Error(`Admin page before TOTP should redirect, got ${beforePage.status}`);

    const enrollment = await request("/api/auth/two-factor/enable", { password, method: "totp" });
    const uri = enrollment.payload?.totpURI;
    if (enrollment.status !== 200 || typeof uri !== "string") throw new Error(`TOTP enrollment failed: ${enrollment.status}`);

    const verification = await request("/api/auth/two-factor/verify-totp", { code: totp(uri) });
    if (verification.status !== 200) throw new Error(`TOTP verification failed: ${verification.status}`);

    const after = await request("/api/auth/admin/list-users");
    if (after.status !== 200) throw new Error(`Admin access after TOTP failed: ${after.status}`);
    const afterPage = await request("/users");
    if (afterPage.status !== 200) throw new Error(`Admin page after TOTP failed: ${afterPage.status}`);

    const childPassword = randomBytes(24).toString("hex");
    const created = await request("/api/auth/admin/create-user", {
      name: "Temporary user",
      email: childEmail,
      password: childPassword,
      role: "user",
    });
    if (created.status !== 200) throw new Error(`Admin user creation failed: ${created.status}`);
    const child = await db.query.user.findFirst({ where: eq(user.email, childEmail) });
    if (!child) throw new Error("Created user was not found in PostgreSQL");

    const adminCookies = new Map(cookieJar);
    cookieJar.clear();
    const childLogin = await request("/api/auth/sign-in/email", { email: childEmail, password: childPassword });
    if (childLogin.status !== 200) throw new Error(`Ordinary user sign-in failed: ${childLogin.status}`);
    const ordinaryAdminAccess = await request("/api/auth/admin/list-users");
    if (ordinaryAdminAccess.status !== 403) throw new Error(`Ordinary user should not manage users: ${ordinaryAdminAccess.status}`);
    const ordinaryPage = await request("/users");
    if (ordinaryPage.status !== 307) throw new Error(`Ordinary user should be redirected from /users: ${ordinaryPage.status}`);
    const childCookies = new Map(cookieJar);
    cookieJar.clear();
    for (const [key, value] of adminCookies) cookieJar.set(key, value);

    const banned = await request("/api/auth/admin/ban-user", { userId: child.id });
    if (banned.status !== 200) throw new Error(`User deactivation failed: ${banned.status}`);
    const deactivated = await db.query.user.findFirst({ where: eq(user.id, child.id) });
    if (!deactivated?.banned) throw new Error("User was not deactivated in PostgreSQL");
    cookieJar.clear();
    for (const [key, value] of childCookies) cookieJar.set(key, value);
    const revoked = await request("/api/auth/get-session");
    if (revoked.payload?.session) throw new Error("Deactivated user's session was not revoked");
    cookieJar.clear();
    for (const [key, value] of adminCookies) cookieJar.set(key, value);

    const directChange = await request("/api/auth/change-password", { currentPassword: password, newPassword: randomBytes(24).toString("hex") });
    if (directChange.status !== 403) throw new Error(`Direct password change should be 403, got ${directChange.status}`);

    const newPassword = randomBytes(24).toString("hex");
    const changed = await request("/api/security/change-password", { currentPassword: password, newPassword, totpCode: totp(uri) });
    if (changed.status !== 200) throw new Error(`Protected password change failed: ${changed.status}`);
    const credential = await db.query.account.findFirst({ where: eq(account.userId, adminId) });
    if (!credential?.password || !(await verifyPassword({ hash: credential.password, password: newPassword }))) {
      throw new Error("New password was not stored by Better Auth");
    }

    await request("/api/auth/sign-out", {});
    cookieJar.clear();
    const challenge = await request("/api/auth/sign-in/email", { email, password: newPassword });
    if (challenge.status !== 200 || challenge.payload?.twoFactorRedirect !== true) {
      throw new Error("Sign-in did not require a second factor after enrollment");
    }
    const pendingSession = await request("/api/auth/get-session");
    if (pendingSession.payload?.session) throw new Error("A session was issued before the second factor");
    const verifiedLogin = await request("/api/auth/two-factor/verify-totp", { code: totp(uri) });
    if (verifiedLogin.status !== 200) throw new Error(`Second-factor sign-in failed: ${verifiedLogin.status}`);
    const finalAccess = await request("/api/auth/admin/list-users");
    if (finalAccess.status !== 200) throw new Error(`Admin access after two-factor sign-in failed: ${finalAccess.status}`);

    const audit = await db.query.securityEvent.findMany({ where: eq(securityEvent.actorUserId, adminId) });
    if (!audit.some((item) => item.action === "admin.ban-user.completed") || !audit.some((item) => item.action === "password.change.completed")) {
      throw new Error("Sensitive actions were not recorded in the security audit");
    }

    console.log("Authentication, TOTP, user administration, password change and security audit verified with disposable local accounts.");
  } finally {
    const child = await db.query.user.findFirst({ where: eq(user.email, childEmail) });
    if (child) await db.delete(securityEvent).where(eq(securityEvent.actorUserId, child.id));
    await db.delete(securityEvent).where(eq(securityEvent.actorUserId, adminId));
    await db.delete(user).where(eq(user.email, childEmail));
    await db.delete(user).where(eq(user.id, adminId));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
