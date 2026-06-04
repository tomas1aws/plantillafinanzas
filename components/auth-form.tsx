"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/actions";
import { createClient } from "@/lib/supabase/browser";

export function AuthForm({ mode, error }: { mode: "login" | "register"; error?: string }) {
  const isLogin = mode === "login";
  const [registerError, setRegisterError] = useState<string>();
  const [registerMessage, setRegisterMessage] = useState<string>();
  const [isRegisterPending, setIsRegisterPending] = useState(false);
  const activeError = isLogin ? error : registerError || error;

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError(undefined);
    setRegisterMessage(undefined);
    setIsRegisterPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setRegisterError(signUpError.message);
      setIsRegisterPending(false);
      return;
    }

    setRegisterMessage("Cuenta creada. Revisá tu email para confirmarla.");
    setIsRegisterPending(false);
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{isLogin ? "Ingresar" : "Crear cuenta"}</CardTitle>
        <CardDescription>{isLogin ? "Accedé a tu tablero financiero." : "Creá tu usuario para empezar a usar la app."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={isLogin ? signIn : undefined} onSubmit={isLogin ? undefined : handleRegister} className="space-y-4">
          {activeError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{activeError}</div> : null}
          {!isLogin && registerMessage ? <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{registerMessage}</div> : null}
          <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required placeholder="tu@email.com" /></div>
          <div className="space-y-2"><Label>Contraseña</Label><Input name="password" type="password" required minLength={6} /></div>
          <Button className="w-full" type="submit" disabled={!isLogin && isRegisterPending}>{isLogin ? "Ingresar" : isRegisterPending ? "Registrando..." : "Registrarme"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"} <Link className="font-medium text-teal-700" href={isLogin ? "/register" : "/login"}>{isLogin ? "Registrate" : "Ingresá"}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
