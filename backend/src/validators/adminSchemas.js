import { z } from "zod";

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["cashier", "warehouse"]),
}).strict();

export const roleSchema = z.object({
  role: z.enum(["cashier", "warehouse"]),
}).strict();

export const statusSchema = z.object({
  active: z.boolean(),
}).strict();

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(25),
  address: z.string().trim().max(200),
  taxId: z.union([z.literal(""), z.string().regex(/^\d{11}$/)]),
  receiptFooter: z.string().trim().max(220),
}).strict();
