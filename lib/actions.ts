"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspaces";
import { accountFormSchema, accountUpdateSchema, categorySchema, inviteSchema, movementSchema, savingsGoalProgressSchema, savingsGoalSchema, workspaceSchema } from "@/lib/validations/finance";

function formObject(formData: FormData) { return Object.fromEntries(formData.entries()); }
function errorRedirect(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function accountErrorRedirect(message: string): never { errorRedirect("/dashboard/accounts", message); }
function goalErrorRedirect(message: string): never { errorRedirect("/dashboard/goals", message); }

async function getActiveWorkspaceId(redirectPath: string, submittedWorkspaceId?: FormDataEntryValue | null) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) errorRedirect(redirectPath, `No pudimos validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");
  try { return String(submittedWorkspaceId || await getOrCreateWorkspace(user.id)); }
  catch (error) { errorRedirect(redirectPath, error instanceof Error ? error.message : "Error desconocido durante el onboarding automático."); }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
export async function signOut() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/login"); }
export async function createWorkspace(formData: FormData) { const parsed = workspaceSchema.parse(formObject(formData)); const supabase = await createClient(); await supabase.from("workspaces").insert(parsed); revalidatePath("/dashboard"); }
export async function inviteMember(formData: FormData) { const parsed = inviteSchema.parse(formObject(formData)); const supabase = await createClient(); await supabase.from("workspace_invitations").insert({ workspace_id: String(formData.get("workspace_id")), ...parsed }); revalidatePath("/dashboard/workspaces"); }

export async function createAccount(formData: FormData) {
  const parsed = accountFormSchema.safeParse(formObject(formData));
  if (!parsed.success) accountErrorRedirect("Revisá los datos de la cuenta e intentá nuevamente.");
  const workspace_id = await getActiveWorkspaceId("/dashboard/accounts");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({ ...parsed.data, workspace_id, is_active: true });
  if (error) accountErrorRedirect(`No pudimos crear la cuenta: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts");
}

export async function updateAccount(formData: FormData) {
  const parsed = accountUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) accountErrorRedirect("Revisá los datos de la cuenta e intentá nuevamente.");
  const supabase = await createClient();
  const { data: account, error: accountError } = await supabase.from("accounts").select("id,currency,initial_balance,current_balance").eq("id", parsed.data.id).single();
  if (accountError || !account) accountErrorRedirect(`No pudimos cargar la cuenta: ${accountError?.message ?? "cuenta inexistente"}`);
  if (account.currency !== parsed.data.currency) {
    const { data: movement, error: movementError } = await supabase.from("movements").select("id").or(`account_id.eq.${parsed.data.id},transfer_account_id.eq.${parsed.data.id}`).limit(1).maybeSingle();
    if (movementError) accountErrorRedirect(`No pudimos verificar los movimientos de la cuenta: ${movementError.message}`);
    if (movement) accountErrorRedirect("No se puede cambiar la moneda de una cuenta que ya tiene movimientos.");
  }
  const initialDelta = parsed.data.initial_balance - Number(account.initial_balance);
  const { id, ...changes } = parsed.data;
  const { error } = await supabase.from("accounts").update({ ...changes, current_balance: Number(account.current_balance) + initialDelta }).eq("id", id);
  if (error) accountErrorRedirect(`No pudimos actualizar la cuenta: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts"); revalidatePath("/dashboard/movements");
}

export async function updateAccountStatus(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_active: formData.get("is_active") === "true" }).eq("id", String(formData.get("id")));
  if (error) accountErrorRedirect(`No pudimos cambiar el estado de la cuenta: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts");
}

export async function createCategory(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/categories", formData.get("workspace_id"));
  const parsed = categorySchema.safeParse({ ...formObject(formData), workspace_id });
  if (!parsed.success) errorRedirect("/dashboard/categories", "Revisá los datos de la categoría e intentá nuevamente.");
  const supabase = await createClient(); const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) errorRedirect("/dashboard/categories", `No pudimos crear la categoría: ${error.message}`);
  revalidatePath("/dashboard/categories");
}

export async function createMovement(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/movements", formData.get("workspace_id"));
  const type = formData.get("type");
  const parsed = movementSchema.safeParse({ ...formObject(formData), workspace_id, transfer_account_id: type === "transfer" ? formData.get("transfer_account_id") || null : null, category_id: formData.get("category_id") || null });
  if (!parsed.success) errorRedirect("/dashboard/movements", parsed.error.issues[0]?.message ?? "Revisá los datos del movimiento e intentá nuevamente.");
  const supabase = await createClient(); const { error } = await supabase.from("movements").insert(parsed.data);
  if (error) errorRedirect("/dashboard/movements", `No pudimos crear el movimiento: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/movements"); revalidatePath("/dashboard/accounts");
}

export async function createSavingsGoal(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/goals", formData.get("workspace_id"));
  const parsed = savingsGoalSchema.safeParse({ ...formObject(formData), workspace_id, target_date: formData.get("target_date") || null });
  if (!parsed.success) goalErrorRedirect("Revisá los datos del objetivo e intentá nuevamente.");
  const supabase = await createClient(); const { error } = await supabase.from("savings_goals").insert(parsed.data);
  if (error) goalErrorRedirect(`No pudimos crear el objetivo: ${error.message}`);
  revalidatePath("/dashboard/goals");
}

export async function updateSavingsGoal(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/goals", formData.get("workspace_id"));
  const parsed = savingsGoalSchema.extend({ id: savingsGoalProgressSchema.shape.id }).safeParse({ ...formObject(formData), workspace_id, target_date: formData.get("target_date") || null });
  if (!parsed.success) goalErrorRedirect("Revisá los datos del objetivo e intentá nuevamente.");
  const { id, ...changes } = parsed.data; const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").update(changes).eq("id", id).eq("workspace_id", workspace_id);
  if (error) goalErrorRedirect(`No pudimos actualizar el objetivo: ${error.message}`);
  revalidatePath("/dashboard/goals");
}

export async function updateSavingsGoalProgress(formData: FormData) {
  const parsed = savingsGoalProgressSchema.safeParse(formObject(formData));
  if (!parsed.success) goalErrorRedirect("Ingresá un monto actual válido.");
  const supabase = await createClient(); const { error } = await supabase.from("savings_goals").update({ current_amount: parsed.data.current_amount }).eq("id", parsed.data.id);
  if (error) goalErrorRedirect(`No pudimos actualizar el progreso: ${error.message}`);
  revalidatePath("/dashboard/goals");
}

export async function deleteSavingsGoal(formData: FormData) {
  const parsed = savingsGoalProgressSchema.shape.id.safeParse(formData.get("id"));
  if (!parsed.success) goalErrorRedirect("El objetivo seleccionado no es válido.");
  const supabase = await createClient(); const { error } = await supabase.from("savings_goals").delete().eq("id", parsed.data);
  if (error) goalErrorRedirect(`No pudimos eliminar el objetivo: ${error.message}`);
  revalidatePath("/dashboard/goals");
}
