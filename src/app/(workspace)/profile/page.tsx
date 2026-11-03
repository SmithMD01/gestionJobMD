import { requireReadySession } from "@/lib/require-session";
import { ProfilePanel } from "./profile-panel";

export default async function ProfilePage() {
  const session = await requireReadySession();
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8">
      <ProfilePanel name={session.user.name} email={session.user.email} role={session.user.role} twoFactorEnabled={!!session.user.twoFactorEnabled} />
    </main>
  );
}
