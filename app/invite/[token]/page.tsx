import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceInvitation } from "@/types/database";

type PublicInvitation = WorkspaceInvitation & {
  workspaces: {
    id: string;
    name: string;
  } | null;
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitationPath = `/invite/${token}`;
  const supabase = await createClient();

  console.log("TOKEN PARAM", token);

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select(`
      *,
      workspaces (
        id,
        name
      )
    `)
    .eq("token", token)
    .eq("status", "pending")
    .single();

  console.log("INVITATION RESULT", {
    data,
    error,
  });

  if (error || !data) {
    const errorMessage = error
      ? `${error.message}${error.code ? ` (Supabase: ${error.code})` : ""}`
      : "Supabase no devolvió la invitación ni un error.";

    return <InvitationCard title="Invitación no válida" message={errorMessage} />;
  }

  const invitation = data as PublicInvitation;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <InvitationCard
        title={`Invitación a ${invitation.workspaces?.name ?? "un workspace"}`}
        message={`Ingresá o creá una cuenta con ${invitation.email} para aceptar la invitación.`}
        action={(
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link href={`/login?redirect=${encodeURIComponent(invitationPath)}`}>Ingresar para aceptar</Link></Button>
            <Button asChild variant="outline"><Link href={`/register?redirect=${encodeURIComponent(invitationPath)}`}>Crear cuenta</Link></Button>
          </div>
        )}
      />
    );
  }

  const { data: workspaceId, error: acceptanceError } = await supabase.rpc("accept_workspace_invitation", { target_token: token });
  if (!acceptanceError && workspaceId) redirect("/workspace-select");

  return <InvitationCard title="No pudimos aceptar la invitación" message={acceptanceError?.message ?? "La invitación ya no está disponible."} action={<Button asChild variant="outline"><Link href="/workspace-select">Volver a workspaces</Link></Button>} />;
}

function InvitationCard({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center p-4"><Card className="max-w-lg"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader>{action ? <CardContent>{action}</CardContent> : null}</Card></main>;
}
