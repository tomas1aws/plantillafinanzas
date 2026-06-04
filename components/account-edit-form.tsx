import { updateAccount } from "@/lib/actions";
import type { Account } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";

export function AccountEditForm({ account, hasMovements }: { account: Account; hasMovements: boolean }) {
  return <details className="group"><summary className="cursor-pointer list-none rounded-xl border bg-white px-3 py-2 text-center text-sm font-medium hover:bg-slate-50">Editar</summary><form action={updateAccount} className="mt-3 grid min-w-64 gap-3 rounded-xl border bg-slate-50 p-3"><input type="hidden" name="id" value={account.id} /><Input name="name" defaultValue={account.name} required /><SelectNative name="type" defaultValue={account.type}><option value="cash">Efectivo</option><option value="bank">Banco</option><option value="wallet">Billetera</option><option value="other">Otra</option></SelectNative><SelectNative name="currency" defaultValue={account.currency} disabled={hasMovements}><option>ARS</option><option>USD</option></SelectNative>{hasMovements ? <><input type="hidden" name="currency" value={account.currency} /><p className="text-xs text-slate-500">La moneda no puede cambiarse porque la cuenta tiene movimientos.</p></> : null}<Input name="initial_balance" type="number" step="0.01" defaultValue={Number(account.initial_balance)} required /><SelectNative name="is_active" defaultValue={String(account.is_active)}><option value="true">Activa</option><option value="false">Inactiva</option></SelectNative><Button size="sm">Guardar cambios</Button></form></details>;
}
