import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { removeOrDeactivateCategory, updateCategory } from "@/lib/actions";
import type { Category } from "@/types/database";

export function CategoryActions({ category }: { category: Category }) {
  return <div className="flex flex-wrap items-start gap-2">
    <details className="group">
      <summary className="cursor-pointer list-none rounded-xl border bg-white px-3 py-2 text-center text-sm font-medium hover:bg-slate-50">Editar</summary>
      <form action={updateCategory} className="mt-3 grid min-w-64 gap-3 rounded-xl border bg-slate-50 p-3">
        <input type="hidden" name="id" value={category.id} />
        <Input name="name" defaultValue={category.name} required />
        <SelectNative name="kind" defaultValue={category.kind}><option value="income">Ingreso</option><option value="expense">Gasto</option></SelectNative>
        <Input name="color" type="color" defaultValue={category.color} />
        <Button size="sm">Guardar cambios</Button>
      </form>
    </details>
    <ConfirmAction action={removeOrDeactivateCategory} id={category.id} label={category.is_active ? "Eliminar" : "Eliminar inactiva"} confirmation="¿Confirmás esta acción? Si la categoría tiene movimientos, se desactivará para conservar el historial." />
  </div>;
}
