import { db } from "@/db/client";
import { securityEvent } from "@/db/schema";

export async function recordSecurityEvent(action: string, actorUserId: string | null, subjectUserId: string | null = null) {
  await db.insert(securityEvent).values({ action, actorUserId, subjectUserId });
}
