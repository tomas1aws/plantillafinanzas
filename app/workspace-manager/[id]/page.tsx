import { notFound, redirect } from "next/navigation";
import { ConfirmAction } from "@/components/confirm-action";
import { CopyInvitationLink, InviteForm } from "@/components/workspace-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { removeWorkspaceMember, revokeWorkspaceInvitation, updateWorkspaceMemberRole, updateWorkspaceName } from "@/lib/actions";
import { getInvitationUrl } from "@/lib/invitations";
import { createClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceInvitation, WorkspaceMember } from "@/types/database";

type Search = { error?: string; message?: string; inviteLink?: string };
export default async function ManageWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect(`/login?redirect=${encodeURIComponent(`/workspace-manager/${id}`)}`);
  const { data: workspace } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle(); if (!workspace || workspace.type !== "shared") notFound();
  const { data: ownMembership } = await supabase.from("workspace_members").select("role").eq("workspace_id", id).eq("user_id", user.id).maybeSingle();
  if (!ownMembership || ownMembership.role === "member") redirect(`/workspace-manager?error=${encodeURIComponent("Solo owner o admin puede administrar ese workspace.")}`);
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] = await Promise.all([supabase.rpc("get_workspace_members", { target_workspace: id }), supabase.from("workspace_invitations").select("*").eq("workspace_id", id).eq("status", "pending").order("created_at", { ascending: false })]);
  const typedWorkspace = workspace as Workspace; const typedMembers = (members ?? []) as WorkspaceMember[]; const pending = (invitations ?? []) as WorkspaceInvitation[]; const error = query.error ?? membersError?.message ?? invitationsError?.message;
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold tracking-tight">Administrar {typedWorkspace.name}</h1><p className="text-slate-500">Gestioná el nombre, miembros e invitaciones pendientes.</p></header>
    {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{query.message ? <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{query.message}</p> : null}{query.inviteLink ? <CopyInvitationLink url={query.inviteLink} /> : null}
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-6"><Card><CardHeader><CardTitle>Miembros</CardTitle><CardDescription>Solo owners cambian roles. No se puede quitar al último owner.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{typedMembers.map((member) => <TableRow key={member.id}><TableCell>{member.email}{member.user_id === user.id ? " (vos)" : ""}</TableCell><TableCell>{member.role}</TableCell><TableCell><div className="flex flex-wrap gap-2">{ownMembership.role === "owner" ? <form action={updateWorkspaceMemberRole} className="flex gap-2"><input type="hidden" name="member_id" value={member.id}/><input type="hidden" name="workspace_id" value={id}/><SelectNative name="role" defaultValue={member.role} className="h-9"><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Miembro</option></SelectNative><Button size="sm" variant="outline">Guardar</Button></form> : null}{ownMembership.role === "owner" || member.role !== "owner" ? <ConfirmAction action={removeWorkspaceMember} id={member.id} hiddenFields={{ workspace_id: id }} label="Quitar" confirmation={`¿Quitar a ${member.email} del workspace?`} /> : null}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle>Invitaciones pendientes</CardTitle></CardHeader><CardContent>{pending.length ? <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Link</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{pending.map((invitation) => <TableRow key={invitation.id}><TableCell>{invitation.email}</TableCell><TableCell>{invitation.role}</TableCell><TableCell>{invitation.token ? <a className="text-sm text-teal-700 underline" href={getInvitationUrl(invitation.token)}>Abrir</a> : <span className="text-sm text-red-700">Token no disponible; no se puede abrir el link.</span>}</TableCell><TableCell><ConfirmAction action={revokeWorkspaceInvitation} id={invitation.id} hiddenFields={{ workspace_id: id }} label="Revocar" confirmation={`¿Revocar la invitación para ${invitation.email}?`} /></TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-slate-500">No hay invitaciones pendientes.</p>}</CardContent></Card></div>
    <div className="space-y-4"><Card><CardHeader><CardTitle>Nombre del workspace</CardTitle></CardHeader><CardContent><form action={updateWorkspaceName} className="grid gap-3"><input type="hidden" name="workspace_id" value={id}/><Label htmlFor="workspace-name">Nombre</Label><Input id="workspace-name" name="name" defaultValue={typedWorkspace.name} required/><Button>Guardar nombre</Button></form></CardContent></Card><InviteForm workspaceId={id} workspaceName={typedWorkspace.name} returnPath={`/workspace-manager/${id}`} /></div></div>
  </div>;
}
