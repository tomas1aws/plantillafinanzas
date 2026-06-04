import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, LogOut, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { selectWorkspace, signOut } from "@/lib/actions";
import { getSessionUser, getWorkspaces } from "@/lib/data";

export default async function WorkspaceSelectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [workspaces, params] = await Promise.all([getWorkspaces(), searchParams]);
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-5xl space-y-8">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-700">Elegí dónde trabajar</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tus workspaces</h1><p className="mt-2 text-slate-500">Entrá a un espacio para ver únicamente sus cuentas, movimientos y objetivos.</p></div><form action={signOut}><Button variant="outline"><LogOut size={16}/>Salir</Button></form></header>
    {params.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workspaces.map((workspace) => <Card key={workspace.id} className="flex min-h-52 flex-col border-slate-200 bg-white shadow-sm"><CardHeader><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">{workspace.type === "personal" ? <UserRound/> : <BriefcaseBusiness/>}</div><CardTitle>{workspace.name}</CardTitle><CardDescription>{workspace.type === "personal" ? "Personal" : "Compartido"} · {workspace.role}</CardDescription></CardHeader><CardContent className="mt-auto"><form action={selectWorkspace}><input type="hidden" name="workspace_id" value={workspace.id}/><Button className="w-full">Entrar <ArrowRight size={16}/></Button></form></CardContent></Card>)}</section>
    <div className="flex flex-wrap gap-3 border-t pt-6"><Button asChild><Link href="/workspace-manager#crear">Crear workspace</Link></Button><Button asChild variant="outline"><Link href="/workspace-manager"><Settings size={16}/>Administrar workspaces</Link></Button></div>
  </div></main>;
}
