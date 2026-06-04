"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { createMovement } from "@/lib/actions";
import { getLocalIsoDate, movementSchema } from "@/lib/validations/finance";
import type { Account, Category } from "@/types/database";

type MovementFormValues = z.input<typeof movementSchema>;
type MovementValues = z.infer<typeof movementSchema>;
const defaults = (workspaceId: string, accounts: Account[]): DefaultValues<MovementFormValues> => ({ workspace_id: workspaceId, type: "expense", currency: "ARS", date: getLocalIsoDate(), account_id: accounts[0]?.id, transfer_account_id: null, category_id: null, description: "" });

export function MovementClientForm({ workspaceId, accounts, categories }: { workspaceId: string; accounts: Account[]; categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<MovementFormValues, unknown, MovementValues>({ resolver: zodResolver(movementSchema), defaultValues: defaults(workspaceId, accounts) });
  const movementType = useWatch({ control: form.control, name: "type" });
  const today = getLocalIsoDate();
  const onSubmit = form.handleSubmit((values) => {
    const formData = new FormData();
    Object.entries({ ...values, transfer_account_id: values.type === "transfer" ? values.transfer_account_id : null }).forEach(([key, value]) => { if (value !== null && value !== undefined) formData.set(key, String(value)); });
    startTransition(() => void createMovement(formData));
  });
  const errorMessage = Object.values(form.formState.errors).find(Boolean)?.message;

  return <Card><CardHeader><CardTitle>Nuevo movimiento</CardTitle></CardHeader><CardContent><form onSubmit={onSubmit} className="grid gap-3"><input type="hidden" {...form.register("workspace_id")} /><Label>Tipo</Label><SelectNative {...form.register("type", { onChange: (event) => { if (event.target.value !== "transfer") form.setValue("transfer_account_id", null); } })}><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="transfer">Transferencia</option></SelectNative><Label>Monto</Label><Input type="number" step="0.01" placeholder="Monto" {...form.register("amount")} /><Label>Moneda</Label><SelectNative {...form.register("currency")}><option>ARS</option><option>USD</option></SelectNative><Label>Fecha</Label><Input type="date" max={today} {...form.register("date")} /><Label>Cuenta origen</Label><SelectNative {...form.register("account_id")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</SelectNative>{movementType === "transfer" ? <><Label>Cuenta destino</Label><SelectNative {...form.register("transfer_account_id", { setValueAs: (value) => value || null })}><option value="">Seleccioná una cuenta destino</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</SelectNative></> : null}<Label>Categoría</Label><SelectNative {...form.register("category_id", { setValueAs: (value) => value || null })}><option value="">Sin categoría</option>{categories.filter((category) => category.kind === movementType).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectNative><Label>Descripción</Label><Input placeholder="Descripción" {...form.register("description")} />{errorMessage ? <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(errorMessage)}</p> : null}<Button disabled={isPending}>{isPending ? "Guardando..." : "Crear movimiento"}</Button></form></CardContent></Card>;
}
