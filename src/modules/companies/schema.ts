import { boolean, primaryKey, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";

export const company = pgTable("company", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companyMember = pgTable("company_member", {
  companyId: uuid("company_id").notNull().references(() => company.id),
  userId: text("user_id").notNull().references(() => user.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.companyId, table.userId] })]);
