import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { getSessionUser } from "@/lib/data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <div className="flex min-h-screen"><Sidebar /><main className="min-w-0 flex-1 p-4 pb-24 lg:p-8">{children}</main><MobileNav /></div>;
}
