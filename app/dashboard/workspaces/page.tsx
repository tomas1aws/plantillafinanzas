import { InviteForm, WorkspaceForm } from "@/components/entity-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";

export default async function WorkspacesPage() {
  const data = await getDashboardData();
  const active = data.activeWorkspace;
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Workspaces</CardTitle></CardHeader><CardContent>{data.onboardingError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.onboardingError}</p> : null}<Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Rol</TableHead></TableRow></TableHeader><TableBody>{data.workspaces.map((w) => <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.type}</TableCell><TableCell>{w.role}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="space-y-4"><WorkspaceForm />{active ? <InviteForm workspaceId={active} /> : null}</div></div>;
}
