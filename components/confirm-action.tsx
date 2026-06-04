"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ConfirmActionProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
  confirmation: string;
  variant?: ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  hiddenFields?: Record<string, string>;
};

export function ConfirmAction({ action, id, label, confirmation, variant = "destructive", disabled = false, hiddenFields = {} }: ConfirmActionProps) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>
    <input type="hidden" name="id" value={id} />
    {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <Button type="submit" size="sm" variant={variant} disabled={disabled}>{label}</Button>
  </form>;
}
