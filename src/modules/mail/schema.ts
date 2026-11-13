import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "@/db/auth-schema";

export const emailDeliveryLog = pgTable("email_delivery_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientUserId: text("recipient_user_id").references(() => user.id, { onDelete: "set null" }),
  recipientEmail: text("recipient_email").notNull(),
  emailType: text("email_type").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("email_delivery_log_recipient_created_idx").on(table.recipientUserId, table.createdAt),
  index("email_delivery_log_status_created_idx").on(table.status, table.createdAt),
]);
