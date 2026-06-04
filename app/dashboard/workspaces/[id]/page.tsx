import { redirect } from "next/navigation";
export default async function LegacyWorkspacePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/workspace-manager/${id}`); }
