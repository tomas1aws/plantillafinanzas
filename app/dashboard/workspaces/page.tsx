import { ConfirmAction } from "@/components/confirm-action";
import { InviteForm, WorkspaceForm } from "@/components/entity-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSharedWorkspace, resetPersonalWorkspace } from "@/lib/actions";
import { getDashboardData } from "@/lib/data";

type Search = { error?: string };

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  const active = data.activeWorkspace;
  const visibleError = error ?? data.onboardingError;

  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <Card>
      <CardHeader><CardTitle>Workspaces</CardTitle></CardHeader>
      <CardContent>
        {visibleError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Rol</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
          <TableBody>{data.workspaces.map((workspace) => <TableRow key={workspace.id}>
            <TableCell>{workspace.name}</TableCell>
            <TableCell>{workspace.type}</TableCell>
            <TableCell>{workspace.role}</TableCell>
            <TableCell>
              {workspace.role === "owner" && workspace.type === "personal" ? <ConfirmAction action={resetPersonalWorkspace} id={workspace.id} label="Resetear" confirmation="Esto borrará todos los datos de este workspace y lo dejará como nuevo." /> : null}
              {workspace.role === "owner" && workspace.type === "shared" ? <ConfirmAction action={deleteSharedWorkspace} id={workspace.id} label="Eliminar" confirmation="Esto eliminará el workspace y todos sus datos. Esta acción no se puede deshacer." /> : null}
              {workspace.role !== "owner" ? <span className="text-sm text-slate-500">Solo owner</span> : null}
            </TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </CardContent>
    </Card>
    <div className="space-y-4"><WorkspaceForm />{active ? <InviteForm workspaceId={active} /> : null}</div>
  </div>;
}
