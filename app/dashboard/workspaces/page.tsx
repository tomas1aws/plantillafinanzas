import Link from "next/link";
import { ConfirmAction } from "@/components/confirm-action";
import { CopyInvitationLink, InviteForm, WorkspaceForm } from "@/components/workspace-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSharedWorkspace, resetPersonalWorkspace } from "@/lib/actions";
import { getDashboardData } from "@/lib/data";

type Search = { error?: string; message?: string; inviteLink?: string };

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, data] = await Promise.all([searchParams, getDashboardData()]);
  const manageable = data.workspaces.filter((workspace) => workspace.type === "shared" && (workspace.role === "owner" || workspace.role === "admin"));
  const visibleError = params.error ?? data.onboardingError;
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold tracking-tight">Workspaces</h1><p className="text-slate-500">Creá espacios compartidos e invitá y administrá a sus miembros.</p></header>
    {visibleError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}
    {params.message ? <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.message}</p> : null}
    {params.inviteLink ? <CopyInvitationLink url={params.inviteLink} /> : null}
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]"><Card><CardHeader><CardTitle>Tus workspaces</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Rol</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{data.workspaces.map((workspace) => <TableRow key={workspace.id}><TableCell>{workspace.name}</TableCell><TableCell>{workspace.type === "shared" ? "Compartido" : "Personal"}</TableCell><TableCell>{workspace.role}</TableCell><TableCell><div className="flex flex-wrap gap-2">{workspace.type === "shared" && workspace.role !== "member" ? <Button asChild size="sm" variant="outline"><Link href={`/dashboard/workspaces/${workspace.id}`}>Administrar</Link></Button> : null}{workspace.role === "owner" && workspace.type === "personal" ? <ConfirmAction action={resetPersonalWorkspace} id={workspace.id} label="Resetear" confirmation="Esto borrará todos los datos de este workspace y lo dejará como nuevo." /> : null}{workspace.role === "owner" && workspace.type === "shared" ? <ConfirmAction action={deleteSharedWorkspace} id={workspace.id} label="Eliminar" confirmation="Esto eliminará el workspace y todos sus datos. Esta acción no se puede deshacer." /> : null}{workspace.role === "member" ? <span className="text-sm text-slate-500">Solo lectura de administración</span> : null}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="space-y-4"><WorkspaceForm />{manageable.length ? <InviteForm workspaces={manageable} /> : null}</div></div>
  </div>;
}
