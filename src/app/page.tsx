import { redirect } from "next/navigation";
import { requireReadySession } from "@/lib/require-session";

export default async function Home() {
  await requireReadySession();
  redirect("/dashboard");
}
