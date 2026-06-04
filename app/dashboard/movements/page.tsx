import { MovementClientForm } from "@/components/movement-client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  const visibleError = error ?? data.onboardingError;
  return <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><Card><CardHeader><CardTitle>Movimientos</CardTitle></CardHeader><CardContent>{visibleError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}<Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Monto</TableHead></TableRow></TableHeader><TableBody>{data.movements.map((m) => <TableRow key={m.id}><TableCell>{m.date}</TableCell><TableCell>{m.type}</TableCell><TableCell>{m.description ?? "—"}</TableCell><TableCell>{formatMoney(Number(m.amount), m.currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><MovementClientForm workspaces={data.workspaces} accounts={data.accounts} categories={data.categories} /></div>;
}
