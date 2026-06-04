import { startOfMonth, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/workspaces";
import type { Account, Category, Currency, Movement, SavingsGoal } from "@/types/database";

const emptyMetrics = { netWorth: 0, income: 0, expense: 0, balance: 0 };

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getWorkspaces() {
  const user = await getSessionUser();
  if (!user) return [];
  return getUserWorkspaces(user.id);
}

export async function getDashboardData(workspaceId?: string, currency: Currency = "ARS") {
  const supabase = await createClient();
  const user = await getSessionUser();

  if (!user) {
    return { workspaces: [], activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], onboardingError: null };
  }

  try {
    const workspaces = await getUserWorkspaces(user.id);
    const requestedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
    const activeWorkspace = requestedWorkspace?.id ?? workspaces[0]?.id ?? null;

    if (!activeWorkspace) {
      return { workspaces, activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], onboardingError: "La creación automática no devolvió un workspace activo." };
    }

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }, { data: movements, error: movementsError }, { data: goals, error: goalsError }] = await Promise.all([
      supabase.from("accounts").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).order("name"),
      supabase.from("categories").select("*").eq("workspace_id", activeWorkspace).order("kind").order("name"),
      supabase.from("movements").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).gte("date", monthStart).order("date", { ascending: false }),
      supabase.from("savings_goals").select("*").eq("workspace_id", activeWorkspace).order("created_at", { ascending: false }),
    ]);

    const queryError = accountsError ?? categoriesError ?? movementsError ?? goalsError;
    if (queryError) throw new Error(`No pudimos cargar los datos del workspace: ${queryError.message}`);

    const typedAccounts = (accounts ?? []) as Account[];
    const typedCategories = (categories ?? []) as Category[];
    const typedMovements = (movements ?? []) as Movement[];
    const typedGoals = (goals ?? []) as SavingsGoal[];
    const activeMovements = typedMovements.filter((movement) => !movement.is_reversed);
    const income = activeMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
    const expense = activeMovements.filter((m) => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
    const netWorth = typedAccounts.filter((a) => a.is_active).reduce((sum, a) => sum + Number(a.current_balance), 0);

    const seriesMap = new Map<string, { date: string; income: number; expense: number }>();
    activeMovements.forEach((movement) => {
      const current = seriesMap.get(movement.date) ?? { date: movement.date, income: 0, expense: 0 };
      if (movement.type === "income") current.income += Number(movement.amount);
      if (movement.type === "expense") current.expense += Number(movement.amount);
      seriesMap.set(movement.date, current);
    });

    const expensesByCategory = typedCategories
      .filter((category) => category.kind === "expense")
      .map((category) => ({ name: category.name, value: activeMovements.filter((m) => m.type === "expense" && m.category_id === category.id).reduce((sum, m) => sum + Number(m.amount), 0), color: category.color }))
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
      onboardingError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido durante el onboarding automático.";
    return { workspaces: [], activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], onboardingError: message };
  }
}

export async function getAccountsData() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return { accounts: [] as Account[], movementAccountIds: [] as string[], onboardingError: null as string | null };
  try {
    const workspaces = await getUserWorkspaces(user.id);
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId) return { accounts: [] as Account[], movementAccountIds: [] as string[], onboardingError: "No hay un workspace activo." };
    const [{ data: accounts, error: accountsError }, { data: movements, error: movementsError }] = await Promise.all([
      supabase.from("accounts").select("*").eq("workspace_id", workspaceId).order("name"),
      supabase.from("movements").select("account_id,transfer_account_id").eq("workspace_id", workspaceId),
    ]);
    if (accountsError || movementsError) throw new Error(accountsError?.message ?? movementsError?.message);
    const movementAccountIds = new Set<string>();
    for (const movement of movements ?? []) {
      movementAccountIds.add(movement.account_id);
      if (movement.transfer_account_id) movementAccountIds.add(movement.transfer_account_id);
    }
    return { accounts: (accounts ?? []) as Account[], movementAccountIds: [...movementAccountIds], onboardingError: null };
  } catch (error) {
    return { accounts: [] as Account[], movementAccountIds: [] as string[], onboardingError: error instanceof Error ? error.message : "No pudimos cargar las cuentas." };
  }
}
