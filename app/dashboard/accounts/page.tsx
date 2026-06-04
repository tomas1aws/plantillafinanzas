import { AccountForm } from "@/components/entity-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { updateAccountStatus } from "@/lib/actions";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Cuentas</CardTitle></CardHeader><CardContent>{error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Saldo</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader><TableBody>{data.accounts.map((a) => <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell>{a.type}</TableCell><TableCell>{formatMoney(Number(a.current_balance), a.currency)}</TableCell><TableCell>{a.is_active ? "Activa" : "Inactiva"}</TableCell><TableCell><form action={updateAccountStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="is_active" value={String(!a.is_active)} /><Button size="sm" variant="outline">{a.is_active ? "Desactivar" : "Activar"}</Button></form></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><AccountForm /></div>;
}
