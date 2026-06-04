import { AuthForm } from "@/components/auth-form";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; redirect?: string }> }) { const params = await searchParams; return <AuthForm mode="register" error={params.error} redirectTo={params.redirect} />; }
