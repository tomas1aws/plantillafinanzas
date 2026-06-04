import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function WorkspaceHeader({ name }: { name: string }) { return <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Workspace actual</p><p className="font-semibold text-slate-900">{name}</p></div><Button asChild variant="outline" size="sm"><Link href="/workspace-select"><ArrowLeftRight size={16}/>Cambiar workspace</Link></Button></header>; }
