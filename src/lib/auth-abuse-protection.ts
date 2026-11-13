import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimit, user } from "@/db/auth-schema";

const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESET_MIN_INTERVAL_MS = 60 * 1000;
const RESET_MAX_PER_WINDOW = 5;
const RESET_IP_WINDOW_MS = 60 * 60 * 1000;
const RESET_IP_MAX_PER_WINDOW = 10;
const RETENTION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastRetentionCleanupAt = 0;

function hashIdentity(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required for auth abuse protection.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function identityKey(kind: "signin-account" | "signin-ip" | "reset-email" | "reset-ip", value: string) {
  return `security:${kind}:${hashIdentity(value)}`;
}

export function getRequestIp(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  // Match Better Auth's trusted proxy configuration; don't accept client-supplied X-Forwarded-For here.
  return "unknown";
}

async function getRecentCount(key: string, now: number, windowMs: number) {
  const [row] = await db.select({ count: rateLimit.count, lastRequest: rateLimit.lastRequest })
    .from(rateLimit).where(eq(rateLimit.key, key)).limit(1);
  if (!row || now - row.lastRequest >= windowMs) return 0;
  return row.count;
}

async function incrementWindowCounter(key: string, now: number, windowMs: number) {
  const cutoff = now - windowMs;
  await db.insert(rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${rateLimit.lastRequest} < ${cutoff} then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: now,
      },
    });
}

export async function registeredEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [record] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizedEmail)).limit(1);
  return Boolean(record);
}

export async function getSignInProgressiveDelay(email: string, ip: string, hasAccount: boolean) {
  const now = Date.now();
  const normalizedEmail = email.trim().toLowerCase();
  const [accountCount, ipCount] = await Promise.all([
    hasAccount ? getRecentCount(identityKey("signin-account", normalizedEmail), now, SIGN_IN_WINDOW_MS) : Promise.resolve(0),
    getRecentCount(identityKey("signin-ip", ip), now, SIGN_IN_WINDOW_MS),
  ]);
  const failures = Math.max(accountCount, ipCount);
  if (failures < 3) return 0;
  return Math.min(30_000, 500 * 2 ** (failures - 3));
}

export async function recordFailedSignIn(email: string, ip: string, hasAccount: boolean) {
  const now = Date.now();
  const normalizedEmail = email.trim().toLowerCase();
  const counters = [incrementWindowCounter(identityKey("signin-ip", ip), now, SIGN_IN_WINDOW_MS)];
  if (hasAccount) counters.push(incrementWindowCounter(identityKey("signin-account", normalizedEmail), now, SIGN_IN_WINDOW_MS));
  await Promise.all(counters);
}

export async function clearSignInFailures(email: string, hasAccount: boolean) {
  if (!hasAccount) return;
  await db.delete(rateLimit).where(eq(rateLimit.key, identityKey("signin-account", email.trim().toLowerCase())));
}

async function consumeBoundedRequest(key: string, now: number, windowMs: number, minIntervalMs: number, maxCount: number) {
  const cutoff = now - windowMs;
  const cooldownCutoff = now - minIntervalMs;
  const accepted = await db.insert(rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${rateLimit.lastRequest} < ${cutoff} then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: now,
      },
      setWhere: sql`(${rateLimit.lastRequest} <= ${cooldownCutoff}) and (${rateLimit.lastRequest} < ${cutoff} or ${rateLimit.count} < ${maxCount})`,
    })
    .returning({ id: rateLimit.id });
  return accepted.length > 0;
}

export async function consumePasswordResetRequest(email: string) {
  const now = Date.now();
  const key = identityKey("reset-email", email.trim().toLowerCase());
  return consumeBoundedRequest(key, now, RESET_WINDOW_MS, RESET_MIN_INTERVAL_MS, RESET_MAX_PER_WINDOW);
}

export async function consumePasswordResetIpRequest(ip: string) {
  return consumeBoundedRequest(identityKey("reset-ip", ip), Date.now(), RESET_IP_WINDOW_MS, 0, RESET_IP_MAX_PER_WINDOW);
}

export async function enforceAuthAbuseRetention() {
  const now = Date.now();
  if (now - lastRetentionCleanupAt < RETENTION_CLEANUP_INTERVAL_MS) return;
  lastRetentionCleanupAt = now;
  // Keep custom identifiers short-lived; values are HMACs, never raw emails or IPs.
  try {
    const cutoff = now - RESET_WINDOW_MS;
    await db.delete(rateLimit).where(sql`${rateLimit.key} like 'security:%' and ${rateLimit.lastRequest} < ${cutoff}`);
  } catch (error) {
    lastRetentionCleanupAt = 0;
    throw error;
  }
}
