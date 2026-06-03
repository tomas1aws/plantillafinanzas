import { CategoryForm } from "@/components/entity-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";

export default async function CategoriesPage() {
  const data = await getDashboardData();
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Categorías</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Color</TableHead></TableRow></TableHeader><TableBody>{data.categories.map((c) => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.kind}</TableCell><TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.color}</span></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><CategoryForm workspaces={data.workspaces} /></div>;
}
