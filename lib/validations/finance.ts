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

export const accountUpdateSchema = accountFormSchema.extend({
  id: z.string().uuid(),
});

export const categorySchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(2),
  kind: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0f766e"),
});

export const categoryUpdateSchema = categorySchema.omit({ workspace_id: true }).extend({
  id: z.string().uuid(),
});

export const maintenanceIdSchema = z.string().uuid();

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
}).superRefine((data, context) => {
  if (data.type === "transfer" && !data.transfer_account_id) context.addIssue({ code: "custom", message: "Las transferencias requieren una cuenta destino.", path: ["transfer_account_id"] });
  if (data.type === "transfer" && data.transfer_account_id === data.account_id) context.addIssue({ code: "custom", message: "La cuenta destino debe ser diferente de la cuenta origen.", path: ["transfer_account_id"] });
  if (data.type !== "transfer" && data.transfer_account_id) context.addIssue({ code: "custom", message: "Solo las transferencias pueden tener cuenta destino.", path: ["transfer_account_id"] });
});

export const savingsGoalSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(2),
  target_amount: z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0).default(0),
  currency: currencySchema,
  target_date: z.string().optional().nullable(),
});

export const savingsGoalProgressSchema = z.object({
  id: z.string().uuid(),
  current_amount: z.coerce.number().min(0),
});
