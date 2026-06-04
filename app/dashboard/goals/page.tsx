import { GoalForm } from "@/components/entity-forms";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  const visibleError = error ?? data.onboardingError;
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="grid gap-4">{visibleError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}{data.goals.map((g) => { const progress = Number(g.current_amount) / Number(g.target_amount) * 100; return <Card key={g.id}><CardHeader><CardTitle>{g.name}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span>{formatMoney(Number(g.current_amount), g.currency)}</span><span>{formatMoney(Number(g.target_amount), g.currency)}</span></div><Progress value={progress} /><p className="text-sm text-slate-500">{progress.toFixed(0)}% completado {g.target_date ? `· fecha objetivo ${g.target_date}` : ""}</p></CardContent></Card>; })}</div><GoalForm workspaces={data.workspaces} /></div>;
}
