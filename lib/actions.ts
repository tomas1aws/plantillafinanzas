"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountSchema, categorySchema, inviteSchema, movementSchema, savingsGoalSchema, workspaceSchema } from "@/lib/validations/finance";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkspace(formData: FormData) {
  const parsed = workspaceSchema.parse(formObject(formData));
  const supabase = await createClient();
  await supabase.from("workspaces").insert(parsed);
  revalidatePath("/dashboard");
}

export async function inviteMember(formData: FormData) {
  const parsed = inviteSchema.parse(formObject(formData));
  const workspace_id = String(formData.get("workspace_id"));
  const supabase = await createClient();
  await supabase.from("workspace_invitations").insert({ workspace_id, ...parsed });
  revalidatePath("/dashboard/workspaces");
}

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.parse({ ...formObject(formData), is_active: formData.get("is_active") === "on" });
  const supabase = await createClient();
  await supabase.from("accounts").insert(parsed);
  revalidatePath("/dashboard/accounts");
}

export async function updateAccountStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("accounts").update({ is_active: formData.get("is_active") === "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/dashboard/accounts");
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.parse(formObject(formData));
  const supabase = await createClient();
  await supabase.from("categories").insert(parsed);
  revalidatePath("/dashboard/categories");
}

export async function createMovement(formData: FormData) {
  const parsed = movementSchema.parse({ ...formObject(formData), transfer_account_id: formData.get("transfer_account_id") || null, category_id: formData.get("category_id") || null });
  const supabase = await createClient();
  await supabase.from("movements").insert(parsed);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
}

export async function createSavingsGoal(formData: FormData) {
  const parsed = savingsGoalSchema.parse(formObject(formData));
  const supabase = await createClient();
  await supabase.from("savings_goals").insert(parsed);
  revalidatePath("/dashboard/goals");
}
