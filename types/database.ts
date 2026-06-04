export type Currency = "ARS" | "USD";
export type WorkspaceType = "personal" | "shared";
export type WorkspaceRole = "owner" | "admin" | "member";
export type AccountType = "cash" | "bank" | "wallet" | "other";
export type MovementType = "income" | "expense" | "transfer";
export type CategoryKind = "income" | "expense";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  workspace_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  is_default: boolean;
  is_active: boolean;
}

export interface Movement {
  id: string;
  workspace_id: string;
  type: MovementType;
  amount: number;
  currency: Currency;
  date: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  is_reversed: boolean;
  reversed_at: string | null;
  reversed_by: string | null;
}

export interface SavingsGoal {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: Currency;
  target_date: string | null;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  status: "pending" | "accepted" | "revoked";
  token: string;
  created_at: string;
  expires_at: string | null;
}
