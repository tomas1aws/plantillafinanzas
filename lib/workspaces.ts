import { createClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceRole } from "@/types/database";

export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

export async function getOrCreateWorkspace(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) throw new Error(`No pudimos validar la sesión: ${userError.message}`);
  if (!user) throw new Error("No hay una sesión activa para crear el workspace.");
  if (user.id !== userId) throw new Error("El usuario de la sesión no coincide con el usuario solicitado.");

  const { data: workspaceId, error } = await supabase.rpc("get_or_create_personal_workspace", { target_user: userId });

  if (error) {
    throw new Error(`No pudimos crear u obtener tu workspace personal: ${error.message}`);
  }

  if (!workspaceId) {
    throw new Error("La creación automática no devolvió un workspace activo.");
  }

  return workspaceId;
}

export async function getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
  const activeWorkspace = await getOrCreateWorkspace(userId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`No pudimos obtener tus workspaces: ${error.message}`);
  }

  const workspaces = (data ?? [])
    .map((row) => {
      const workspace = row.workspaces as unknown as Workspace | null;
      return workspace ? ({ ...workspace, role: row.role as WorkspaceRole }) : null;
    })
    .filter((workspace): workspace is WorkspaceWithRole => Boolean(workspace));

  const activeWorkspaceIndex = workspaces.findIndex((workspace) => workspace.id === activeWorkspace);
  if (activeWorkspaceIndex === -1) {
    throw new Error("No pudimos obtener el workspace activo después de crearlo.");
  }

  if (activeWorkspaceIndex === 0) return workspaces;
  return [workspaces[activeWorkspaceIndex], ...workspaces.filter((_, index) => index !== activeWorkspaceIndex)];
}
