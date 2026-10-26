import { text, timestamp, uuid, pgTable } from "drizzle-orm/pg-core";
import { user } from "@/db/auth-schema";
import { company } from "@/modules/companies/schema";

export const auditEvent = pgTable("audit_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => company.id),
  actorUserId: text("actor_user_id").notNull().references(() => user.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  entityName: text("entity_name").notNull().default(""),
  action: text("action").notNull(),
  changeDetail: text("change_detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
