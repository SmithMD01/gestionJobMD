import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export * from "./auth-schema";

// Bootstrap table for validating migrations. Business tables are added by their module.
export const appMetadata = pgTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const securityEvent = pgTable("security_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  subjectUserId: text("subject_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
