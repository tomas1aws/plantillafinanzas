"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getInvitationToken, getInvitationUrl, sendInvitationEmail } from "@/lib/invitations";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspaces";
import { accountFormSchema, accountUpdateSchema, categorySchema, categoryUpdateSchema, inviteSchema, maintenanceIdSchema, movementSchema, savingsGoalProgressSchema, savingsGoalSchema, workspaceNameSchema, workspaceSchema } from "@/lib/validations/finance";

function formObject(formData: FormData) { return Object.fromEntries(formData.entries()); }
function errorRedirect(path: string, message: string): never { redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`); }
function accountErrorRedirect(message: string): never { errorRedirect("/dashboard/accounts", message); }
function goalErrorRedirect(message: string): never { errorRedirect("/dashboard/goals", message); }
function categoryErrorRedirect(message: string): never { errorRedirect("/dashboard/categories", message); }
function movementErrorRedirect(message: string): never { errorRedirect("/dashboard/movements", message); }
function workspaceErrorRedirect(message: string): never { errorRedirect("/dashboard/workspaces", message); }
function safeRedirect(value: FormDataEntryValue | null, fallback = "/dashboard") { const path = String(value || fallback); return path.startsWith("/") && !path.startsWith("//") ? path : fallback; }

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
  const redirectTo = safeRedirect(formData.get("redirect"));
  const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  redirect(redirectTo);
}
export async function signOut() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/login"); }

export async function createWorkspace(formData: FormData) {
  const parsed = workspaceSchema.safeParse(formObject(formData));
  if (!parsed.success) workspaceErrorRedirect(parsed.error.issues[0]?.message ?? "Revisá los datos del workspace.");
  const supabase = await createClient();
  const { data: invitationResult, error } = await supabase.rpc("create_workspace_with_invitation", {
    target_name: parsed.data.name,
    target_type: parsed.data.type,
    invitation_email: parsed.data.invitation_email || null,
    invitation_role: parsed.data.invitation_role,
  });
  if (error) workspaceErrorRedirect(`No pudimos crear el workspace: ${error.message}`);
  const invitationToken = getInvitationToken(invitationResult);
  let message = "Workspace creado correctamente.";
  if (parsed.data.invitation_email && !invitationToken) workspaceErrorRedirect("El workspace se creó, pero la invitación no devolvió un token válido. Revisá las invitaciones pendientes antes de compartir el link.");
  if (invitationToken && parsed.data.invitation_email) {
    const invitationUrl = getInvitationUrl(invitationToken);
    const delivery = await sendInvitationEmail({ email: parsed.data.invitation_email, workspaceName: parsed.data.name, invitationUrl });
    message = delivery.sent ? "Workspace creado e invitación enviada." : "Workspace creado. Compartí el link de invitación manualmente.";
    redirect(`/dashboard/workspaces?message=${encodeURIComponent(message)}&inviteLink=${encodeURIComponent(invitationUrl)}`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/workspaces?message=${encodeURIComponent(message)}`);
}

export async function inviteMember(formData: FormData) {
  const parsed = inviteSchema.safeParse(formObject(formData));
  const workspaceId = maintenanceIdSchema.safeParse(formData.get("workspace_id"));
  if (!parsed.success || !workspaceId.success) workspaceErrorRedirect("Revisá los datos de la invitación.");
  const supabase = await createClient();
  const { data: invitationToken, error } = await supabase.rpc("create_workspace_invitation", {
    target_email: parsed.data.email,
    target_role: parsed.data.role,
    target_workspace: workspaceId.data,
  });
  const returnPath = safeRedirect(formData.get("return_path"), "/dashboard/workspaces");
  if (error) errorRedirect(returnPath, `No pudimos crear la invitación: ${error.message}`);
  const normalizedInvitationToken = getInvitationToken(invitationToken);
  if (!normalizedInvitationToken) errorRedirect(returnPath, "La invitación se creó, pero no devolvió un token válido. No se generó ningún link para compartir.");
  const invitationUrl = getInvitationUrl(normalizedInvitationToken);
  const workspaceName = String(formData.get("workspace_name") || "workspace compartido");
  const delivery = await sendInvitationEmail({ email: parsed.data.email, workspaceName, invitationUrl });
  revalidatePath("/dashboard/workspaces"); revalidatePath(returnPath);
  const message = delivery.sent ? "Invitación enviada correctamente." : "Invitación creada. Como el email no está configurado o falló, compartí el link manualmente.";
  redirect(`${returnPath}?message=${encodeURIComponent(message)}&inviteLink=${encodeURIComponent(invitationUrl)}`);
}

export async function updateWorkspaceName(formData: FormData) {
  const parsed = workspaceNameSchema.safeParse(formObject(formData));
  if (!parsed.success) workspaceErrorRedirect(parsed.error.issues[0]?.message ?? "Revisá el nombre.");
  const supabase = await createClient(); const { error } = await supabase.from("workspaces").update({ name: parsed.data.name }).eq("id", parsed.data.workspace_id);
  if (error) errorRedirect(`/dashboard/workspaces/${parsed.data.workspace_id}`, error.message);
  revalidatePath("/dashboard/workspaces"); redirect(`/dashboard/workspaces/${parsed.data.workspace_id}?message=${encodeURIComponent("Nombre actualizado.")}`);
}

export async function updateWorkspaceMemberRole(formData: FormData) {
  const member = maintenanceIdSchema.safeParse(formData.get("member_id")); const role = String(formData.get("role")); const workspace = maintenanceIdSchema.safeParse(formData.get("workspace_id"));
  if (!member.success || !workspace.success || !["owner","admin","member"].includes(role)) workspaceErrorRedirect("Datos de miembro inválidos.");
  const supabase = await createClient(); const { error } = await supabase.rpc("update_workspace_member_role", { target_member: member.data, target_role: role });
  if (error) errorRedirect(`/dashboard/workspaces/${workspace.data}`, error.message);
  revalidatePath(`/dashboard/workspaces/${workspace.data}`); redirect(`/dashboard/workspaces/${workspace.data}?message=${encodeURIComponent("Rol actualizado.")}`);
}

export async function removeWorkspaceMember(formData: FormData) {
  const member = maintenanceIdSchema.safeParse(formData.get("id")); const workspace = maintenanceIdSchema.safeParse(formData.get("workspace_id"));
  if (!member.success || !workspace.success) workspaceErrorRedirect("Miembro inválido.");
  const supabase = await createClient(); const { error } = await supabase.rpc("remove_workspace_member", { target_member: member.data });
  if (error) errorRedirect(`/dashboard/workspaces/${workspace.data}`, error.message);
  revalidatePath(`/dashboard/workspaces/${workspace.data}`); redirect(`/dashboard/workspaces/${workspace.data}?message=${encodeURIComponent("Miembro eliminado.")}`);
}

export async function revokeWorkspaceInvitation(formData: FormData) {
  const invitation = maintenanceIdSchema.safeParse(formData.get("id")); const workspace = maintenanceIdSchema.safeParse(formData.get("workspace_id"));
  if (!invitation.success || !workspace.success) workspaceErrorRedirect("Invitación inválida.");
  const supabase = await createClient(); const { error } = await supabase.rpc("revoke_workspace_invitation", { target_invitation: invitation.data });
  if (error) errorRedirect(`/dashboard/workspaces/${workspace.data}`, error.message);
  revalidatePath(`/dashboard/workspaces/${workspace.data}`); redirect(`/dashboard/workspaces/${workspace.data}?message=${encodeURIComponent("Invitación revocada.")}`);
}

export async function resetPersonalWorkspace(formData: FormData) {
  const id = maintenanceIdSchema.safeParse(formData.get("id")); if (!id.success) workspaceErrorRedirect("El workspace seleccionado no es válido.");
  const supabase = await createClient(); const { error } = await supabase.rpc("reset_personal_workspace", { target_workspace: id.data });
  if (error) workspaceErrorRedirect(error.message); revalidatePath("/dashboard"); redirect("/dashboard/workspaces");
}
export async function deleteSharedWorkspace(formData: FormData) {
  const id = maintenanceIdSchema.safeParse(formData.get("id")); if (!id.success) workspaceErrorRedirect("El workspace seleccionado no es válido.");
  const supabase = await createClient(); const { error } = await supabase.rpc("delete_workspace_cascade", { target_workspace: id.data });
  if (error) workspaceErrorRedirect(error.message); revalidatePath("/dashboard"); redirect("/dashboard/workspaces");
}

export async function createAccount(formData: FormData) {
  const parsed = accountFormSchema.safeParse(formObject(formData));
  if (!parsed.success) accountErrorRedirect("Revisá los datos de la cuenta e intentá nuevamente.");
  const workspace_id = await getActiveWorkspaceId("/dashboard/accounts");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({ ...parsed.data, workspace_id });
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
  const { error } = await supabase.from("accounts").update({ ...changes, current_balance: Number(account.current_balance) + initialDelta }).eq("id", id).select("id").single();
  if (error) accountErrorRedirect(`No pudimos actualizar la cuenta: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts"); revalidatePath("/dashboard/movements");
}

export async function deleteAccount(formData: FormData) {
  const id = maintenanceIdSchema.safeParse(formData.get("id"));
  if (!id.success) accountErrorRedirect("La cuenta seleccionada no es válida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_account_with_movements", { target_id: id.data });
  if (error) accountErrorRedirect(`No pudimos eliminar la cuenta y sus movimientos: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts"); revalidatePath("/dashboard/movements");
  redirect("/dashboard/accounts");
}

export async function createCategory(formData: FormData) {
  const workspace_id = await getActiveWorkspaceId("/dashboard/categories", formData.get("workspace_id"));
  const parsed = categorySchema.safeParse({ ...formObject(formData), workspace_id });
  if (!parsed.success) errorRedirect("/dashboard/categories", "Revisá los datos de la categoría e intentá nuevamente.");
  const supabase = await createClient(); const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) errorRedirect("/dashboard/categories", `No pudimos crear la categoría: ${error.message}`);
  revalidatePath("/dashboard/categories");
}

export async function updateCategory(formData: FormData) {
  const parsed = categoryUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) categoryErrorRedirect("Revisá los datos de la categoría e intentá nuevamente.");
  const { id, ...changes } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update(changes).eq("id", id);
  if (error) categoryErrorRedirect(`No pudimos actualizar la categoría: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/categories"); revalidatePath("/dashboard/movements");
}

export async function removeOrDeactivateCategory(formData: FormData) {
  const id = maintenanceIdSchema.safeParse(formData.get("id"));
  if (!id.success) categoryErrorRedirect("La categoría seleccionada no es válida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_or_deactivate_category", { target_id: id.data });
  if (error) categoryErrorRedirect(`No pudimos eliminar o desactivar la categoría: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/categories"); revalidatePath("/dashboard/movements");
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

export async function reverseMovement(formData: FormData) {
  const id = maintenanceIdSchema.safeParse(formData.get("id"));
  if (!id.success) movementErrorRedirect("El movimiento seleccionado no es válido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reverse_movement", { target_id: id.data });
  if (error) movementErrorRedirect(`No pudimos revertir el movimiento: ${error.message}`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/accounts"); revalidatePath("/dashboard/movements");
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
  const supabase = await createClient();
  const { data: deletedGoal, error } = await supabase.from("savings_goals").delete().eq("id", parsed.data).select("id").maybeSingle();
  if (error) goalErrorRedirect(`No pudimos eliminar el objetivo: ${error.message}`);
  if (!deletedGoal) goalErrorRedirect("No pudimos eliminar el objetivo. Verificá que exista y que tengas permisos para eliminarlo.");
  revalidatePath("/dashboard/goals");
  redirect("/dashboard/goals");
}
