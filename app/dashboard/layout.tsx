import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getSessionUser } from "@/lib/data";
import { getActiveWorkspace } from "@/lib/workspaces";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { const user = await getSessionUser(); if (!user) redirect("/login"); const workspace = await getActiveWorkspace(user.id); if (!workspace) redirect("/workspace-select"); return <div className="flex min-h-screen"><Sidebar/><main className="min-w-0 flex-1 p-4 pb-24 lg:p-8"><WorkspaceHeader name={workspace.name}/>{children}</main><MobileNav/></div>; }
