import { date, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { company } from "../companies/schema";

export const projectStatus = pgEnum("project_status", ["planned", "active", "paused", "completed", "cancelled"]);

export const project = pgTable("project", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => company.id),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  description: text("description").notNull().default(""),
  status: projectStatus("status").notNull().default("planned"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectAuditEvent = pgTable("project_audit_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  actorUserId: text("actor_user_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
