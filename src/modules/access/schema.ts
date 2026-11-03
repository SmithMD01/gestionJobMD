import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { company } from "../companies/schema";

export const appRole = pgTable("app_role", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("app_role_company_key_uidx").on(table.companyId, table.key),
  index("app_role_company_idx").on(table.companyId),
]);

export const companyUserRole = pgTable("company_user_role", {
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => appRole.id, { onDelete: "restrict" }),
  assignedBy: text("assigned_by").notNull().references(() => user.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.companyId, table.userId] }),
  index("company_user_role_role_idx").on(table.roleId),
]);

export const roleModulePermission = pgTable("role_module_permission", {
  roleId: uuid("role_id").notNull().references(() => appRole.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  canAccess: boolean("can_access").notNull().default(false),
  updatedBy: text("updated_by").notNull().references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.moduleKey] }),
  index("role_module_permission_module_idx").on(table.moduleKey),
]);
