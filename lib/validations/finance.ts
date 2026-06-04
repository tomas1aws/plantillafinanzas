import { z } from "zod";

export const currencySchema = z.enum(["ARS", "USD"]);

export const workspaceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["personal", "shared"]).default("shared"),
});

export const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member"]).default("member"),
});

export const accountFormSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["cash", "bank", "wallet", "other"]),
  currency: currencySchema,
  initial_balance: z.coerce.number().default(0),
});

export const accountSchema = accountFormSchema.extend({
  workspace_id: z.string().uuid(),
  is_active: z.coerce.boolean().default(true),
});

export const categorySchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(2),
  kind: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0f766e"),
});

export const movementSchema = z.object({
  workspace_id: z.string().uuid(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive(),
  currency: currencySchema,
  date: z.string().min(10),
  account_id: z.string().uuid(),
  transfer_account_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().max(240).optional().nullable(),
}).refine((data) => data.type !== "transfer" || data.transfer_account_id, {
  message: "Las transferencias requieren cuenta destino",
  path: ["transfer_account_id"],
});

export const savingsGoalSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(2),
  target_amount: z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0).default(0),
  currency: currencySchema,
  target_date: z.string().optional().nullable(),
});
