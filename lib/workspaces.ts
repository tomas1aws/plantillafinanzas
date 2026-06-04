import { createClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceRole } from "@/types/database";

export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

const INITIAL_ACCOUNTS = [
  { name: "Efectivo", type: "cash" as const },
  { name: "Banco", type: "bank" as const },
  { name: "Mercado Pago", type: "wallet" as const },
];

async function ensureInitialAccounts(workspaceId: string) {
  const supabase = await createClient();
  const accountNames = INITIAL_ACCOUNTS.map((account) => account.name);
  const { data: existingAccounts, error: existingAccountsError } = await supabase
    .from("accounts")
    .select("name")
    .eq("workspace_id", workspaceId)
    .in("name", accountNames);

  if (existingAccountsError) {
    throw new Error(`No pudimos verificar las cuentas iniciales: ${existingAccountsError.message}`);
  }

  const existingNames = new Set((existingAccounts ?? []).map((account) => account.name));
  const missingAccounts = INITIAL_ACCOUNTS.filter((account) => !existingNames.has(account.name));

  if (!missingAccounts.length) return;

  const { error: accountsError } = await supabase.from("accounts").insert(
    missingAccounts.map((account) => ({
      ...account,
      workspace_id: workspaceId,
      currency: "ARS" as const,
      initial_balance: 0,
      current_balance: 0,
      is_active: true,
    })),
  );

  if (accountsError) {
    throw new Error(`No pudimos crear las cuentas iniciales: ${accountsError.message}`);
  }
}

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

  await ensureInitialAccounts(workspaceId);

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
