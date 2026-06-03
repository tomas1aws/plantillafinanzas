import { AccountForm } from "@/components/entity-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { updateAccountStatus } from "@/lib/actions";
import { formatMoney } from "@/lib/utils";

export default async function AccountsPage() {
  const data = await getDashboardData();
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Cuentas</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Saldo</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader><TableBody>{data.accounts.map((a) => <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell>{a.type}</TableCell><TableCell>{formatMoney(Number(a.current_balance), a.currency)}</TableCell><TableCell>{a.is_active ? "Activa" : "Inactiva"}</TableCell><TableCell><form action={updateAccountStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="is_active" value={String(!a.is_active)} /><Button size="sm" variant="outline">{a.is_active ? "Desactivar" : "Activar"}</Button></form></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><AccountForm workspaces={data.workspaces} /></div>;
}
