"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { createMovement } from "@/lib/actions";
import { movementSchema } from "@/lib/validations/finance";
import type { Account, Category, Workspace } from "@/types/database";

type MovementValues = z.infer<typeof movementSchema>;

export function MovementClientForm({ workspaces, accounts, categories }: { workspaces: Workspace[]; accounts: Account[]; categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<MovementValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      workspace_id: workspaces[0]?.id,
      type: "expense",
      currency: "ARS",
      date: new Date().toISOString().slice(0, 10),
      account_id: accounts[0]?.id,
      transfer_account_id: null,
      category_id: null,
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.set(key, String(value));
    });
    startTransition(() => void createMovement(formData));
  });

  return <Card><CardHeader><CardTitle>Nuevo movimiento</CardTitle></CardHeader><CardContent><form onSubmit={onSubmit} className="grid gap-3"><SelectNative {...form.register("workspace_id")}>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative><SelectNative {...form.register("type")}><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="transfer">Transferencia</option></SelectNative><Input type="number" step="0.01" placeholder="Monto" {...form.register("amount")} /><SelectNative {...form.register("currency")}><option>ARS</option><option>USD</option></SelectNative><Input type="date" {...form.register("date")} /><SelectNative {...form.register("account_id")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectNative><SelectNative {...form.register("transfer_account_id", { setValueAs: (value) => value || null })}><option value="">Cuenta destino</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectNative><SelectNative {...form.register("category_id", { setValueAs: (value) => value || null })}><option value="">Sin categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectNative><Input placeholder="Descripción" {...form.register("description")} />{Object.values(form.formState.errors).length ? <p className="text-sm text-red-600">Revisá los campos requeridos.</p> : null}<Button disabled={isPending}>{isPending ? "Guardando..." : "Crear movimiento"}</Button></form></CardContent></Card>;
}
