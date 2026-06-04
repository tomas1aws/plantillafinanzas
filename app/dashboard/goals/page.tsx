import { GoalForm } from "@/components/entity-forms";
import { GoalActions } from "@/components/goal-actions";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };
export default async function GoalsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  const visibleError = error ?? data.onboardingError;
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="grid gap-4">{visibleError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}{data.goals.map((goal) => { const progress = Number(goal.current_amount) / Number(goal.target_amount) * 100; return <Card key={goal.id}><CardHeader><CardTitle>{goal.name}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span>{formatMoney(Number(goal.current_amount), goal.currency)}</span><span>{formatMoney(Number(goal.target_amount), goal.currency)}</span></div><Progress value={Math.min(progress, 100)} /><p className="text-sm text-slate-500">{progress.toFixed(0)}% completado {goal.target_date ? `· fecha objetivo ${goal.target_date}` : ""}</p><GoalActions goal={goal} /></CardContent></Card>; })}{data.goals.length === 0 ? <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">Todavía no hay objetivos de ahorro.</p> : null}</div><GoalForm workspaces={data.workspaces} /></div>;
}
