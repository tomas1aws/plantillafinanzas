import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const invitationPath = `/invite/${token}`; const supabase = await createClient();
  const { data: details, error: detailError } = await supabase.rpc("get_invitation_details", { target_token: token });
  const invitation = Array.isArray(details) ? details[0] : details;
  if (detailError || !invitation) return <InvitationCard title="Invitación no válida" message="El link no existe o ya no está disponible." />;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(invitationPath)}`);
  const { data: workspaceId, error } = await supabase.rpc("accept_workspace_invitation", { target_token: token });
  if (!error && workspaceId) redirect(`/dashboard?workspace=${workspaceId}`);
  return <InvitationCard title="No pudimos aceptar la invitación" message={error?.message ?? "La invitación ya no está disponible."} action={<Button asChild variant="outline"><Link href="/dashboard/workspaces">Volver a workspaces</Link></Button>} />;
}
function InvitationCard({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) { return <main className="grid min-h-screen place-items-center p-4"><Card className="max-w-lg"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader>{action ? <CardContent>{action}</CardContent> : null}</Card></main>; }
