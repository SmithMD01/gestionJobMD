import { boolean, date, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { company, companyTeamMember } from "../companies/schema";

export const projectStatus = pgEnum("project_status", ["planned", "active", "paused", "completed", "cancelled"]);
export const activityStatus = pgEnum("activity_status", ["to_validate", "pending", "in_progress", "blocked", "completed", "cancelled"]);
export const activityType = pgEnum("activity_type", ["task", "meeting", "coordination", "follow_up", "development", "other"]);
export const activityOrigin = pgEnum("activity_origin", ["manual", "voice", "email", "meeting", "automation"]);
export const developmentStage = pgTable("development_stage", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("neutral"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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

export const projectContact = pgTable("project_contact", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activity = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  title: text("title").notNull(),
  code: text("code").notNull().default(""),
  developmentStageId: uuid("development_stage_id").references(() => developmentStage.id),
  type: activityType("type").notNull().default("task"),
  status: activityStatus("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(3),
  activityDate: date("activity_date"),
  dueDate: date("due_date"),
  hours: integer("hours"),
  observations: text("observations").notNull().default(""),
  checklist: text("checklist").notNull().default(""),
  origin: activityOrigin("origin").notNull().default("manual"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityResponsible = pgTable("activity_responsible", {
  activityId: uuid("activity_id").notNull().references(() => activity.id),
  teamMemberId: uuid("team_member_id").notNull().references(() => companyTeamMember.id),
}, (table) => [primaryKey({ columns: [table.activityId, table.teamMemberId] })]);

export const projectAuditEvent = pgTable("project_audit_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  actorUserId: text("actor_user_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
