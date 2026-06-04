import Link from "next/link";
import { BarChart3, CircleDollarSign, PiggyBank, ReceiptText } from "lucide-react";

export function MobileNav() {
  return <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-4 rounded-2xl border bg-[var(--card)] p-2 shadow-lg lg:hidden">
    <Link className="grid place-items-center text-xs" href="/dashboard"><BarChart3 size={18}/>Inicio</Link>
    <Link className="grid place-items-center text-xs" href="/dashboard/accounts"><CircleDollarSign size={18}/>Cuentas</Link>
    <Link className="grid place-items-center text-xs" href="/dashboard/movements"><ReceiptText size={18}/>Movs.</Link>
    <Link className="grid place-items-center text-xs" href="/dashboard/goals"><PiggyBank size={18}/>Metas</Link>
  </nav>;
}
