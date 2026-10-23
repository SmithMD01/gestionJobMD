import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Bootstrap table for validating migrations. Business tables are added by their module.
export const appMetadata = pgTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
