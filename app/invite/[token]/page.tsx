import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: tokenParam } = await params;
  const invitationPath = `/invite/${tokenParam}`;
  const supabase = await createClient();
  const { data: invitation, error } = await supabase.rpc("get_invitation_details", { target_token: tokenParam }).single();

  console.log({
    tokenParam,
    invitation,
    error,
  });

  if (error || !invitation) return <InvitationCard title="Invitación no válida" message="El link no existe o ya no está disponible." />;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(invitationPath)}`);
  const { data: workspaceId, error: acceptanceError } = await supabase.rpc("accept_workspace_invitation", { target_token: tokenParam });
  if (!acceptanceError && workspaceId) redirect(`/dashboard?workspace=${workspaceId}`);
  return <InvitationCard title="No pudimos aceptar la invitación" message={acceptanceError?.message ?? "La invitación ya no está disponible."} action={<Button asChild variant="outline"><Link href="/dashboard/workspaces">Volver a workspaces</Link></Button>} />;
}
function InvitationCard({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) { return <main className="grid min-h-screen place-items-center p-4"><Card className="max-w-lg"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader>{action ? <CardContent>{action}</CardContent> : null}</Card></main>; }
