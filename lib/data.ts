import { startOfMonth, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Movement, SavingsGoal, Workspace } from "@/types/database";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getWorkspaces() {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role, workspaces(*)").order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({ ...(row.workspaces as unknown as Workspace), role: row.role }));
}

export async function getDashboardData(workspaceId?: string, currency: "ARS" | "USD" = "ARS") {
  const supabase = await createClient();
  const workspaces = await getWorkspaces();
  const activeWorkspace = workspaceId ?? workspaces[0]?.id;
  if (!activeWorkspace) return { workspaces, activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: { netWorth: 0, income: 0, expense: 0, balance: 0 }, series: [], expensesByCategory: [] };

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const [{ data: accounts }, { data: categories }, { data: movements }, { data: goals }] = await Promise.all([
    supabase.from("accounts").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).order("name"),
    supabase.from("categories").select("*").eq("workspace_id", activeWorkspace).order("kind").order("name"),
    supabase.from("movements").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).gte("date", monthStart).order("date", { ascending: false }).limit(50),
    supabase.from("savings_goals").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).order("created_at", { ascending: false }),
  ]);

  const typedAccounts = (accounts ?? []) as Account[];
  const typedCategories = (categories ?? []) as Category[];
  const typedMovements = (movements ?? []) as Movement[];
  const typedGoals = (goals ?? []) as SavingsGoal[];
  const income = typedMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
  const expense = typedMovements.filter((m) => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
  const netWorth = typedAccounts.filter((a) => a.is_active).reduce((sum, a) => sum + Number(a.current_balance), 0);

  const seriesMap = new Map<string, { date: string; income: number; expense: number }>();
  typedMovements.forEach((movement) => {
    const current = seriesMap.get(movement.date) ?? { date: movement.date, income: 0, expense: 0 };
    if (movement.type === "income") current.income += Number(movement.amount);
    if (movement.type === "expense") current.expense += Number(movement.amount);
    seriesMap.set(movement.date, current);
  });

  const expensesByCategory = typedCategories
    .filter((category) => category.kind === "expense")
    .map((category) => ({ name: category.name, value: typedMovements.filter((m) => m.category_id === category.id).reduce((sum, m) => sum + Number(m.amount), 0), color: category.color }))
    .filter((item) => item.value > 0);

  return {
    workspaces,
    activeWorkspace,
    accounts: typedAccounts,
    categories: typedCategories,
    movements: typedMovements,
    goals: typedGoals,
    metrics: { netWorth, income, expense, balance: income - expense },
    series: Array.from(seriesMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    expensesByCategory,
  };
}
