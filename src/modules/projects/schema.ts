import { sql } from "drizzle-orm";
import { boolean, date, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { company, companyTeamMember } from "../companies/schema";


export const projectStatus = pgEnum("project_status", ["planned", "active", "paused", "completed", "cancelled"]);
export const projectScheduleStatus = pgEnum("project_schedule_status", ["draft", "confirmed"]);
export const projectScheduleItemStatus = pgEnum("project_schedule_item_status", ["planned", "in_progress", "completed"]);
export const projectScheduleItemKind = pgEnum("project_schedule_item_kind", ["phase", "activity"]);
export const activityStatus = pgEnum("activity_status", ["to_validate", "pending", "in_progress", "blocked", "completed", "cancelled"]);
export const activityType = pgEnum("activity_type", ["task", "meeting", "coordination", "follow_up", "development", "other"]);
export const activityOrigin = pgEnum("activity_origin", ["manual", "voice", "email", "meeting", "automation"]);
export const documentationStatus = pgEnum("documentation_status", ["draft", "in_review", "approved", "archived"]);
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

export const projectModule = pgTable("project_module", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  parentId: uuid("parent_id").references((): AnyPgColumn => projectModule.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
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

export const projectDocument = pgTable("project_document", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  groupId: text("group_id").notNull(),
  typeId: text("type_id").notNull(),
  title: text("title").notNull(),
  version: integer("version").notNull().default(1),
  uploadKey: uuid("upload_key"),
  status: documentationStatus("status").notNull().default("draft"),
  isFinal: boolean("is_final").notNull().default(false),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_document_final_type_uidx").on(table.projectId, table.groupId, table.typeId).where(sql`${table.isFinal} = true`),
  uniqueIndex("project_document_version_uidx").on(table.projectId, table.groupId, table.typeId, table.version),
  uniqueIndex("project_document_upload_key_uidx").on(table.projectId, table.uploadKey),
]);

export const activity = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  title: text("title").notNull(),
  code: text("code").notNull().default(""),
  developmentStageId: uuid("development_stage_id").references(() => developmentStage.id),
  moduleId: uuid("module_id").references(() => projectModule.id),
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

export const projectSchedule = pgTable("project_schedule", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().unique().references(() => project.id),
  status: projectScheduleStatus("status").notNull().default("draft"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedBy: text("confirmed_by").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectScheduleItem = pgTable("project_schedule_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id").notNull().references(() => projectSchedule.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  kind: projectScheduleItemKind("kind").notNull().default("activity"),
  color: text("color").notNull().default("blue"),
  status: projectScheduleItemStatus("status").notNull().default("planned"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
