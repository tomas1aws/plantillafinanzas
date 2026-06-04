import { DashboardCharts } from "@/components/dashboard-charts";
import { DashboardPeriodFilter } from "@/components/dashboard-period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = {
  currency?: "ARS" | "USD";
  period?: string;
  from?: string;
  to?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const currency = params.currency ?? "ARS";
  const data = await getDashboardData(currency, { period: params.period, from: params.from, to: params.to });

  return <div className="space-y-6">
    {data.onboardingError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.onboardingError}</p> : null}
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-slate-500">Analizá saldos y movimientos por el período que necesites.</p>
    </header>
    <DashboardPeriodFilter key={`${data.dateRange.period}-${data.dateRange.from}-${data.dateRange.to}`} currency={currency} period={data.dateRange.period} from={data.dateRange.from} to={data.dateRange.to} activeLabel={data.dateRange.label} />
    <section className="grid gap-4 md:grid-cols-4">
      {[["Patrimonio", data.metrics.netWorth], ["Ingresos", data.metrics.income], ["Gastos", data.metrics.expense], ["Balance", data.metrics.balance]].map(([label, value]) => <Card key={label as string}><CardHeader><CardTitle className="text-sm text-slate-500">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatMoney(value as number, currency)}</p><p className="mt-1 text-xs text-slate-400">{data.dateRange.label}</p></CardContent></Card>)}
    </section>
    <DashboardCharts series={data.series} expensesByCategory={data.expensesByCategory} />
    <section className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Saldo por cuenta al cierre</CardTitle></CardHeader><CardContent>{data.accounts.length ? data.accounts.map((account) => <div key={account.id} className="flex justify-between border-b py-3 last:border-0"><span>{account.name}</span><strong>{formatMoney(Number(account.current_balance), account.currency)}</strong></div>) : <p className="text-sm text-slate-500">No hay cuentas para este período.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Movimientos del período</CardTitle></CardHeader><CardContent>{data.movements.length ? <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Monto</TableHead></TableRow></TableHeader><TableBody>{data.movements.slice(0, 8).map((movement) => <TableRow key={movement.id}><TableCell>{movement.date}</TableCell><TableCell>{movement.type}</TableCell><TableCell>{formatMoney(Number(movement.amount), movement.currency)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-slate-500">No hay movimientos activos en el período seleccionado.</p>}</CardContent></Card>
    </section>
  </div>;
}
