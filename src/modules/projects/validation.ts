import { z } from "zod";

const projectStatus = z.enum(["planned", "active", "paused", "completed", "cancelled"]);

export const projectStatusInput = z.object({
  status: projectStatus,
  expectedStatus: projectStatus,
}).strict();

export const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000),
  status: projectStatus,
  startDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: "La fecha de fin debe ser igual o posterior a la de inicio",
  path: ["endDate"],
});

export type ProjectInput = z.infer<typeof projectInput>;

export const projectModuleInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  parentId: z.uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export type ProjectModuleInput = z.infer<typeof projectModuleInput>;

export const projectContactInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().max(254).email(), z.literal("")]).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
}).transform(({ email, phone, ...contact }) => ({
  ...contact,
  email: email || null,
  phone: phone || null,
}));

export type ProjectContactInput = z.infer<typeof projectContactInput>;

export const projectDependencyInput = z.object({
  externalCode: z.string().trim().max(80).nullable().optional(),
  responsible: z.string().trim().max(160).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  category: z.enum(["document", "workflow", "business_rule", "data", "other"]),
  status: z.enum(["pending", "answered", "awaiting_confirmation", "implemented", "resolved"]),
  response: z.string().trim().max(5000).default(""),
  dueDate: z.iso.date().nullable(),
  relatedDependencyIds: z.array(z.uuid()).max(100).default([]),
}).transform((value) => ({ ...value, externalCode: value.externalCode || null, responsible: value.responsible || null }))
  .refine((value) => new Set(value.relatedDependencyIds).size === value.relatedDependencyIds.length, {
    message: "No repitas dependencias relacionadas",
    path: ["relatedDependencyIds"],
  });

export type ProjectDependencyInput = z.infer<typeof projectDependencyInput>;

export const activityInput = z.object({
  title: z.string().trim().min(1).max(160),
  developmentStageId: z.uuid().nullable().optional(),
  moduleId: z.uuid().nullable().optional(),
  type: z.enum(["task", "meeting", "coordination", "follow_up", "development", "other"]),
  status: z.enum(["to_validate", "pending", "in_progress", "blocked", "completed", "cancelled"]),
  priority: z.number().int().min(1).max(5),
  activityDate: z.iso.date().nullable(),
  dueDate: z.iso.date().nullable(),
  hours: z.number().int().min(0).max(10000).nullable(),
  observations: z.string().trim().max(5000),
  checklist: z.string().trim().max(5000),
  origin: z.enum(["manual", "voice", "email", "meeting", "automation"]),
  responsibleIds: z.array(z.uuid()).max(20).default([]),
}).refine((value) => !value.activityDate || !value.dueDate || value.dueDate >= value.activityDate, { path: ["dueDate"], message: "La fecha límite debe ser posterior o igual a la fecha de actividad" });
