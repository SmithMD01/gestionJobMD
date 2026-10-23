import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireReadySession() {
  const session = await requireSession();
  if (session.user.role === "admin" && !session.user.twoFactorEnabled) {
    redirect("/security/totp");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireReadySession();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}
