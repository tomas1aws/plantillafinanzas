import { AccountEditForm } from "@/components/account-edit-form";
import { AccountForm } from "@/components/entity-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountsData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };
export default async function AccountsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getAccountsData()]);
  const visibleError = error ?? data.onboardingError;
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Cuentas</CardTitle></CardHeader><CardContent>{visibleError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}<Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Saldo</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{data.accounts.map((account) => <TableRow key={account.id}><TableCell>{account.name}</TableCell><TableCell>{account.type}</TableCell><TableCell>{formatMoney(Number(account.current_balance), account.currency)}</TableCell><TableCell>{account.is_active ? "Activa" : "Inactiva"}</TableCell><TableCell><AccountEditForm account={account} hasMovements={data.movementAccountIds.includes(account.id)} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><AccountForm /></div>;
}
