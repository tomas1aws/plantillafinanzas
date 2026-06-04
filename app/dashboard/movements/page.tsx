import { ConfirmAction } from "@/components/confirm-action";
import { MovementClientForm } from "@/components/movement-client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reverseMovement } from "@/lib/actions";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

type Search = { error?: string };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ error }, data] = await Promise.all([searchParams, getDashboardData()]);
  const visibleError = error ?? data.onboardingError;
  return <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><Card><CardHeader><CardTitle>Movimientos</CardTitle></CardHeader><CardContent>{visibleError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{visibleError}</p> : null}<Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Categoría</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{data.movements.map((movement) => <TableRow key={movement.id} className={movement.is_reversed ? "text-slate-400" : undefined}><TableCell>{movement.date}</TableCell><TableCell>{movement.type}</TableCell><TableCell>{movement.description ?? "—"}</TableCell><TableCell>{data.categories.find((category) => category.id === movement.category_id)?.name ?? "—"}</TableCell><TableCell className={movement.is_reversed ? "line-through" : undefined}>{formatMoney(Number(movement.amount), movement.currency)}</TableCell><TableCell>{movement.is_reversed ? "Revertido" : "Activo"}</TableCell><TableCell><ConfirmAction action={reverseMovement} id={movement.id} label="Revertir" confirmation="¿Confirmás que querés revertir este movimiento? Los saldos afectados se corregirán y la acción no se puede deshacer." disabled={movement.is_reversed} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><MovementClientForm workspaceId={data.activeWorkspace ?? ""} accounts={data.accounts} categories={data.categories.filter((category) => category.is_active)} /></div>;
}
