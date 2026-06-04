import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmAction } from "@/components/confirm-action";
import { CopyInvitationLink, InviteForm, WorkspaceForm } from "@/components/workspace-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSharedWorkspace, resetPersonalWorkspace } from "@/lib/actions";
import { getSessionUser, getWorkspaces } from "@/lib/data";

type Search = { error?: string; message?: string; inviteLink?: string };
export default async function WorkspaceManagerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSessionUser(); if (!user) redirect("/login");
  const [params, workspaces] = await Promise.all([searchParams, getWorkspaces()]);
  const manageable = workspaces.filter((workspace) => workspace.type === "shared" && (workspace.role === "owner" || workspace.role === "admin"));
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Administrar workspaces</h1><p className="text-slate-500">Creá espacios y gestioná miembros fuera del dashboard financiero.</p></div><Button asChild variant="outline"><Link href="/workspace-select">Volver a elegir workspace</Link></Button></header>
    {params.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}{params.message ? <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.message}</p> : null}{params.inviteLink ? <CopyInvitationLink url={params.inviteLink}/> : null}
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]"><Card><CardHeader><CardTitle>Tus workspaces</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Rol</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{workspaces.map((workspace) => <TableRow key={workspace.id}><TableCell>{workspace.name}</TableCell><TableCell>{workspace.type === "shared" ? "Compartido" : "Personal"}</TableCell><TableCell>{workspace.role}</TableCell><TableCell><div className="flex flex-wrap gap-2">{workspace.type === "shared" && workspace.role !== "member" ? <Button asChild size="sm" variant="outline"><Link href={`/workspace-manager/${workspace.id}`}>Administrar</Link></Button> : null}{workspace.role === "owner" && workspace.type === "personal" ? <ConfirmAction action={resetPersonalWorkspace} id={workspace.id} label="Resetear" confirmation="Esto borrará todos los datos de este workspace y lo dejará como nuevo."/> : null}{workspace.role === "owner" && workspace.type === "shared" ? <ConfirmAction action={deleteSharedWorkspace} id={workspace.id} label="Eliminar" confirmation="Esto eliminará el workspace y todos sus datos. Esta acción no se puede deshacer."/> : null}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div id="crear" className="space-y-4"><WorkspaceForm/>{manageable.length ? <InviteForm workspaces={manageable}/> : null}</div></div>
  </div></main>;
}
