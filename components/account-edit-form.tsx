import { ConfirmAction } from "@/components/confirm-action";
import { deleteAccount, updateAccount } from "@/lib/actions";
import type { Account } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";

export function AccountEditForm({ account, hasMovements }: { account: Account; hasMovements: boolean }) {
  return <div className="flex flex-wrap gap-2">
    <details>
      <summary className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium">Editar</summary>
      <form action={updateAccount} className="mt-2 grid min-w-64 gap-2 rounded-xl border bg-[var(--card)] p-3 shadow-lg">
        <input type="hidden" name="id" value={account.id} />
        <Input name="name" defaultValue={account.name} required />
        <SelectNative name="type" defaultValue={account.type}><option value="cash">Efectivo</option><option value="bank">Banco</option><option value="wallet">Billetera</option><option value="other">Otra</option></SelectNative>
        <SelectNative name="currency" defaultValue={account.currency} disabled={hasMovements}><option>ARS</option><option>USD</option></SelectNative>
        {hasMovements ? <><input type="hidden" name="currency" value={account.currency} /><p className="text-xs text-slate-500">La moneda no puede cambiarse porque la cuenta tiene movimientos.</p></> : null}
        <Input name="initial_balance" type="number" step="0.01" defaultValue={Number(account.initial_balance)} required />
        <Button size="sm">Guardar cambios</Button>
      </form>
    </details>
    <ConfirmAction action={deleteAccount} id={account.id} label="Eliminar" confirmation="Esto eliminará la cuenta y todos sus movimientos asociados. Esta acción no se puede deshacer." />
  </div>;
}
