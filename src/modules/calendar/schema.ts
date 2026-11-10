import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "@/db/auth-schema";
import { company } from "@/modules/companies/schema";

export const calendarAccount = pgTable("calendar_account", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("manual"),
  isActive: boolean("is_active").notNull().default(true),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  grantedScopes: text("granted_scopes"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("calendar_account_user_idx").on(table.userId),
  uniqueIndex("calendar_account_user_provider_email_uidx").on(table.userId, table.provider, table.email),
]);

export const calendarDestination = pgTable("calendar_destination", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => calendarAccount.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companyCalendarBinding = pgTable("company_calendar_binding", {
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => calendarAccount.id, { onDelete: "set null" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  showCentralized: boolean("show_centralized").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.companyId, table.userId] }),
  index("company_calendar_binding_user_idx").on(table.userId),
]);

export const calendarEvent = pgTable("calendar_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  participants: text("participants").notNull().default("[]"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("America/Lima"),
  allDay: boolean("all_day").notNull().default(false),
  sourceAccountId: uuid("source_account_id").references(() => calendarAccount.id, { onDelete: "set null" }),
  externalCalendarId: text("external_calendar_id"),
  externalEventId: text("external_event_id"),
  destinationAccountId: uuid("destination_account_id").references(() => calendarAccount.id, { onDelete: "set null" }),
  syncStatus: text("sync_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("calendar_event_user_company_start_idx").on(table.userId, table.companyId, table.startsAt),
  index("calendar_event_user_start_idx").on(table.userId, table.startsAt),
  uniqueIndex("calendar_event_external_source_uidx").on(table.sourceAccountId, table.externalCalendarId, table.externalEventId),
]);

export const calendarSyncRun = pgTable("calendar_sync_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => calendarAccount.id, { onDelete: "cascade" }),
  trigger: text("trigger").notNull().default("manual"),
  status: text("status").notNull().default("running"),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  apiRequests: integer("api_requests").notNull().default(0),
  fetchedEvents: integer("fetched_events").notNull().default(0),
  removedEvents: integer("removed_events").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  index("calendar_sync_run_user_started_idx").on(table.userId, table.startedAt),
  index("calendar_sync_run_account_started_idx").on(table.accountId, table.startedAt),
]);

/** One installation-level switch controlling whether this instance may call calendar providers. */
export const calendarInstanceConfig = pgTable("calendar_instance_config", {
  id: integer("id").primaryKey(),
  syncMode: text("sync_mode").notNull().default("origin"),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
