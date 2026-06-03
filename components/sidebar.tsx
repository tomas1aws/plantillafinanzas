import Link from "next/link";
import { BarChart3, CircleDollarSign, FolderKanban, PiggyBank, ReceiptText, Tags, Users } from "lucide-react";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const nav = [
  ["Dashboard", "/dashboard", BarChart3],
  ["Cuentas", "/dashboard/accounts", CircleDollarSign],
  ["Movimientos", "/dashboard/movements", ReceiptText],
  ["Categorías", "/dashboard/categories", Tags],
  ["Objetivos", "/dashboard/goals", PiggyBank],
  ["Workspaces", "/dashboard/workspaces", Users],
] as const;

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-white/80 p-4 backdrop-blur max-lg:hidden">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 text-lg font-bold"><FolderKanban className="text-teal-700" /> Finanzas</Link>
      <nav className="flex-1 space-y-1">
        {nav.map(([label, href, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"><Icon size={18} />{label}</Link>)}
      </nav>
      <form action={signOut}><Button variant="outline" className="w-full">Salir</Button></form>
    </aside>
  );
}
