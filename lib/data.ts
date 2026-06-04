import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getDashboardDateRange, type DashboardPeriodSelection } from "@/lib/dashboard-period";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace, getUserWorkspaces } from "@/lib/workspaces";
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

export async function getDashboardData(currency: Currency = "ARS", periodSelection: DashboardPeriodSelection = {}) {
  const supabase = await createClient();
  const user = await getSessionUser();
  const dateRange = getDashboardDateRange(periodSelection);

  if (!user) {
    return { workspaces: [], activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], dateRange, onboardingError: null };
  }

  try {
    const workspace = await getActiveWorkspace(user.id);
    const activeWorkspace = workspace?.id ?? null;
    const workspaces = workspace ? [workspace] : [];
    if (!activeWorkspace) return { workspaces, activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], dateRange, onboardingError: "No hay un workspace activo." };

    let movementsQuery = supabase.from("movements").select("*").eq("workspace_id", activeWorkspace).order("date", { ascending: false });
    if (dateRange.to) movementsQuery = movementsQuery.lte("date", dateRange.to);

    const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }, { data: movements, error: movementsError }, { data: goals, error: goalsError }] = await Promise.all([
      supabase.from("accounts").select("*").eq("workspace_id", activeWorkspace).eq("currency", currency).order("name"),
      supabase.from("categories").select("*").eq("workspace_id", activeWorkspace).order("kind").order("name"),
      movementsQuery,
      supabase.from("savings_goals").select("*").eq("workspace_id", activeWorkspace).order("created_at", { ascending: false }),
    ]);

    const queryError = accountsError ?? categoriesError ?? movementsError ?? goalsError;
    if (queryError) throw new Error(`No pudimos cargar los datos del workspace: ${queryError.message}`);

    const typedAccounts = (accounts ?? []) as Account[];
    const typedCategories = (categories ?? []) as Category[];
    const historicalMovements = ((movements ?? []) as Movement[]).filter((movement) => !movement.is_reversed);
    const activeMovements = historicalMovements.filter((movement) => movement.currency === currency && (!dateRange.from || movement.date >= dateRange.from));
    const income = activeMovements.filter((movement) => movement.type === "income").reduce((sum, movement) => sum + Number(movement.amount), 0);
    const expense = activeMovements.filter((movement) => movement.type === "expense").reduce((sum, movement) => sum + Number(movement.amount), 0);

    const accountBalances = new Map(typedAccounts.map((account) => [account.id, Number(account.initial_balance)]));
    historicalMovements.forEach((movement) => {
      const amount = Number(movement.amount);
      if (movement.type === "income") accountBalances.set(movement.account_id, (accountBalances.get(movement.account_id) ?? 0) + amount);
      if (movement.type === "expense") accountBalances.set(movement.account_id, (accountBalances.get(movement.account_id) ?? 0) - amount);
      if (movement.type === "transfer") {
        accountBalances.set(movement.account_id, (accountBalances.get(movement.account_id) ?? 0) - amount);
        if (movement.transfer_account_id && accountBalances.has(movement.transfer_account_id)) accountBalances.set(movement.transfer_account_id, (accountBalances.get(movement.transfer_account_id) ?? 0) + amount);
      }
    });
    const periodAccounts = typedAccounts
      .filter((account) => !dateRange.to || account.created_at.slice(0, 10) <= dateRange.to)
      .map((account) => ({ ...account, current_balance: accountBalances.get(account.id) ?? Number(account.initial_balance) }));
    const netWorth = periodAccounts.reduce((sum, account) => sum + Number(account.current_balance), 0);

    const seriesMap = new Map<string, { date: string; income: number; expense: number }>();
    activeMovements.forEach((movement) => {
      const month = movement.date.slice(0, 7);
      const current = seriesMap.get(month) ?? { date: format(parseISO(`${month}-01`), "MMM yyyy", { locale: es }), income: 0, expense: 0 };
      if (movement.type === "income") current.income += Number(movement.amount);
      if (movement.type === "expense") current.expense += Number(movement.amount);
      seriesMap.set(month, current);
    });

    const expensesByCategory = typedCategories
      .filter((category) => category.kind === "expense")
      .map((category) => ({ name: category.name, value: activeMovements.filter((movement) => movement.type === "expense" && movement.category_id === category.id).reduce((sum, movement) => sum + Number(movement.amount), 0), color: category.color }))
      .filter((item) => item.value > 0);

    return {
      workspaces,
      activeWorkspace,
      accounts: periodAccounts,
      categories: typedCategories,
      movements: activeMovements,
      goals: (goals ?? []) as SavingsGoal[],
      metrics: { netWorth, income, expense, balance: income - expense },
      series: Array.from(seriesMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
      expensesByCategory,
      dateRange,
      onboardingError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido durante el onboarding automático.";
    return { workspaces: [], activeWorkspace: null, accounts: [], categories: [], movements: [], goals: [], metrics: emptyMetrics, series: [], expensesByCategory: [], dateRange, onboardingError: message };
  }
}

export async function getAccountsData() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return { accounts: [] as Account[], movementAccountIds: [] as string[], onboardingError: null as string | null };
  try {
    const workspaceId = (await getActiveWorkspace(user.id))?.id;
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
