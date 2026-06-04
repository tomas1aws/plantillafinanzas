import { AuthForm } from "@/components/auth-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; redirect?: string }> }) { const params = await searchParams; return <AuthForm mode="login" error={params.error} redirectTo={params.redirect} />; }
