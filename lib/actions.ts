"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountFormSchema, categorySchema, inviteSchema, movementSchema, savingsGoalSchema, workspaceSchema } from "@/lib/validations/finance";
import type { Workspace } from "@/types/database";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function accountErrorRedirect(message: string): never {
  redirect(`/dashboard/accounts?error=${encodeURIComponent(message)}`);
}

async function getOrCreateActiveWorkspaceId() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    accountErrorRedirect("No pudimos obtener tu workspace activo. Intentá nuevamente.");
  }

  const activeWorkspace = (memberships ?? [])
    .map((row) => row.workspaces as unknown as Workspace | null)
    .find((workspace): workspace is Workspace => Boolean(workspace));

  if (activeWorkspace) return activeWorkspace.id;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: "Personal", type: "personal", owner_id: user.id })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    accountErrorRedirect("No pudimos crear tu workspace personal. Intentá nuevamente.");
  }

  return workspace.id;
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

  const workspace_id = await getOrCreateActiveWorkspaceId();
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({
    ...parsed.data,
    workspace_id,
    is_active: true,
  });

  if (error) {
    accountErrorRedirect("No pudimos crear la cuenta. Intentá nuevamente.");
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
