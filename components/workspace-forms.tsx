"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { createWorkspace, inviteMember } from "@/lib/actions";
import type { Workspace } from "@/types/database";

export function WorkspaceForm() {
  const [type, setType] = useState("shared");
  return <Card><CardHeader><CardTitle>Nuevo workspace</CardTitle><CardDescription>Creá un espacio personal o empezá a compartirlo desde ahora.</CardDescription></CardHeader><CardContent><form action={createWorkspace} className="grid gap-3">
    <div className="space-y-2"><Label htmlFor="workspace-name">Nombre</Label><Input id="workspace-name" name="name" required /></div>
    <div className="space-y-2"><Label htmlFor="workspace-type">Tipo</Label><SelectNative id="workspace-type" name="type" value={type} onChange={(event) => setType(event.target.value)}><option value="shared">Compartido</option><option value="personal">Personal</option></SelectNative></div>
    {type === "shared" ? <div className="grid gap-3 rounded-xl border bg-slate-50 p-3"><p className="text-sm font-medium">Invitación inicial <span className="font-normal text-slate-500">(opcional)</span></p><div className="space-y-2"><Label htmlFor="initial-email">Email del invitado</Label><Input id="initial-email" name="invitation_email" type="email" placeholder="persona@email.com" /></div><div className="space-y-2"><Label htmlFor="initial-role">Rol</Label><SelectNative id="initial-role" name="invitation_role"><option value="member">Miembro</option><option value="admin">Admin</option></SelectNative></div></div> : null}
    <Button>Crear workspace</Button>
  </form></CardContent></Card>;
}

export function InviteForm({ workspaces, workspaceId, workspaceName, returnPath }: { workspaces?: (Workspace & { role?: string })[]; workspaceId?: string; workspaceName?: string; returnPath?: string }) {
  return <Card><CardHeader><CardTitle>Invitar miembro</CardTitle><CardDescription>La invitación queda pendiente hasta que la acepte el email indicado.</CardDescription></CardHeader><CardContent><form action={inviteMember} className="grid gap-3">
    {workspaceId ? <><input type="hidden" name="workspace_id" value={workspaceId} /><input type="hidden" name="workspace_name" value={workspaceName} /></> : <div className="space-y-2"><Label htmlFor="invite-workspace">Workspace</Label><SelectNative id="invite-workspace" name="workspace_id">{workspaces?.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</SelectNative></div>}
    {returnPath ? <input type="hidden" name="return_path" value={returnPath} /> : null}
    <div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" name="email" type="email" required /></div>
    <div className="space-y-2"><Label htmlFor="invite-role">Rol</Label><SelectNative id="invite-role" name="role"><option value="member">Miembro</option><option value="admin">Admin</option></SelectNative></div>
    <Button>Crear invitación</Button>
  </form></CardContent></Card>;
}

export function CopyInvitationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="mb-2 text-sm font-medium text-teal-900">Link para compartir manualmente</p><div className="flex gap-2"><Input readOnly value={url} aria-label="Link de invitación" /><Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>{copied ? "Copiado" : "Copiar"}</Button></div></div>;
}
