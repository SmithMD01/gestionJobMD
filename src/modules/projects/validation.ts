import { z } from "zod";

export const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000),
  status: z.enum(["planned", "active", "paused", "completed", "cancelled"]),
  startDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: "La fecha de fin debe ser igual o posterior a la de inicio",
  path: ["endDate"],
});

export type ProjectInput = z.infer<typeof projectInput>;

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
