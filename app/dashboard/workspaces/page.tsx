import { InviteForm, WorkspaceForm } from "@/components/entity-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";

export default async function WorkspacesPage() {
  const data = await getDashboardData();
  const active = data.activeWorkspace;
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Workspaces</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Rol</TableHead></TableRow></TableHeader><TableBody>{data.workspaces.map((w) => <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.type}</TableCell><TableCell>{w.role}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="space-y-4"><WorkspaceForm />{active ? <InviteForm workspaceId={active} /> : null}</div></div>;
}
