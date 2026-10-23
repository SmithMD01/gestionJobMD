import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-session";
import { UsersPanel } from "./users-panel";

export default async function UsersPage() {
  const session = await requireAdmin();
  const result = await auth.api.listUsers({ query: { limit: 20, offset: 0, sortBy: "createdAt", sortDirection: "desc" }, headers: await headers() });

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
      <UsersPanel currentUserId={session.user.id} initialUsers={result.users} initialTotal={result.total} />
    </main>
  );
}
