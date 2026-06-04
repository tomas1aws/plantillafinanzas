import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceRole } from "@/types/database";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";
export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

export async function getOrCreateWorkspace(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`No pudimos validar la sesión: ${userError.message}`);
  if (!user) throw new Error("No hay una sesión activa para crear el workspace.");
  if (user.id !== userId) throw new Error("El usuario de la sesión no coincide con el usuario solicitado.");
  const { data: workspaceId, error } = await supabase.rpc("get_or_create_personal_workspace", { target_user: userId });
  if (error) throw new Error(`No pudimos crear u obtener tu workspace personal: ${error.message}`);
  if (!workspaceId) throw new Error("La creación automática no devolvió un workspace personal.");
  return workspaceId;
}

export async function getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
  await getOrCreateWorkspace(userId);
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_members").select("role, workspaces(*)").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw new Error(`No pudimos obtener tus workspaces: ${error.message}`);
  return (data ?? []).map((row) => {
    const workspace = row.workspaces as unknown as Workspace | null;
    return workspace ? ({ ...workspace, role: row.role as WorkspaceRole }) : null;
  }).filter((workspace): workspace is WorkspaceWithRole => Boolean(workspace));
}

export async function getActiveWorkspace(userId: string): Promise<WorkspaceWithRole | null> {
  const workspaceId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!workspaceId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_members").select("role, workspaces(*)").eq("user_id", userId).eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw new Error(`No pudimos validar el workspace activo: ${error.message}`);
  const workspace = data?.workspaces as unknown as Workspace | null;
  return workspace && data ? { ...workspace, role: data.role as WorkspaceRole } : null;
}
