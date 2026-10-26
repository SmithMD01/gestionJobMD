import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireReadySession } from "@/lib/require-session";
import { SessionsPanel } from "./sessions-panel";

export default async function SessionsPage() {
  await requireReadySession();
  const sessions = await auth.api.listSessions({ headers: await headers() });
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Mis sesiones</h1>
      <SessionsPanel initialSessions={sessions} />
    </main>
  );
}
