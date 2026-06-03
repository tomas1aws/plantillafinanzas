"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type SignUpState } from "@/lib/actions";

const initialSignUpState: SignUpState = {};

export function AuthForm({ mode, error }: { mode: "login" | "register"; error?: string }) {
  const isLogin = mode === "login";
  const [signUpState, signUpAction, isSignUpPending] = useActionState(signUp, initialSignUpState);
  const activeError = isLogin ? error : signUpState.error || error;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{isLogin ? "Ingresar" : "Crear cuenta"}</CardTitle>
        <CardDescription>{isLogin ? "Accedé a tu tablero financiero." : "Creá tu usuario para empezar a usar la app."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={isLogin ? signIn : signUpAction} className="space-y-4">
          {activeError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{activeError}</div> : null}
          {!isLogin && signUpState.message ? <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{signUpState.message}</div> : null}
          <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required placeholder="tu@email.com" /></div>
          <div className="space-y-2"><Label>Contraseña</Label><Input name="password" type="password" required minLength={6} /></div>
          <Button className="w-full" type="submit" disabled={!isLogin && isSignUpPending}>{isLogin ? "Ingresar" : isSignUpPending ? "Registrando..." : "Registrarme"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"} <Link className="font-medium text-teal-700" href={isLogin ? "/register" : "/login"}>{isLogin ? "Registrate" : "Ingresá"}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
