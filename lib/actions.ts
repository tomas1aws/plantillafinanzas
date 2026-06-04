"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspaces";
import { accountFormSchema, categorySchema, inviteSchema, movementSchema, savingsGoalSchema, workspaceSchema } from "@/lib/validations/finance";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function accountErrorRedirect(message: string): never {
  errorRedirect("/dashboard/accounts", message);
}

async function getActiveWorkspaceId(redirectPath: string, submittedWorkspaceId?: FormDataEntryValue | null) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) errorRedirect(redirectPath, `No pudimos validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");

  try {
    const workspaceId = await getOrCreateWorkspace(user.id);
    return String(submittedWorkspaceId || workspaceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido durante el onboarding automático.";
    errorRedirect(redirectPath, message);
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
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
  const parsed = accountFormSchema.safeParse(formObject(formData));

  if (!parsed.success) {
    accountErrorRedirect("Revisá los datos de la cuenta e intentá nuevamente.");
  }

  const workspace_id = await getActiveWorkspaceId("/dashboard/accounts");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({
    ...parsed.data,
    workspace_id,
    is_active: true,
  });

  if (error) {
    accountErrorRedirect(`No pudimos crear la cuenta: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
}

export async function updateAccountStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("accounts").update({ is_active: formData.get("is_active") === "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/dashboard/accounts");
}

export async function createCategory(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/categories", formData.get("workspace_id"));
  const parsed = categorySchema.safeParse({ ...formObject(formData), workspace_id });

  if (!parsed.success) {
    errorRedirect("/dashboard/categories", "Revisá los datos de la categoría e intentá nuevamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert(parsed.data);

  if (error) {
    errorRedirect("/dashboard/categories", `No pudimos crear la categoría: ${error.message}`);
  }

  revalidatePath("/dashboard/categories");
}

export async function createMovement(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/movements", formData.get("workspace_id"));
  const parsed = movementSchema.safeParse({ ...formObject(formData), workspace_id, transfer_account_id: formData.get("transfer_account_id") || null, category_id: formData.get("category_id") || null });

  if (!parsed.success) {
    errorRedirect("/dashboard/movements", "Revisá los datos del movimiento e intentá nuevamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("movements").insert(parsed.data);

  if (error) {
    errorRedirect("/dashboard/movements", `No pudimos crear el movimiento: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
}

export async function createSavingsGoal(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/goals", formData.get("workspace_id"));
  const parsed = savingsGoalSchema.safeParse({ ...formObject(formData), workspace_id });

  if (!parsed.success) {
    errorRedirect("/dashboard/goals", "Revisá los datos del objetivo e intentá nuevamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").insert(parsed.data);

  if (error) {
    errorRedirect("/dashboard/goals", `No pudimos crear el objetivo: ${error.message}`);
  }

  revalidatePath("/dashboard/goals");
}
