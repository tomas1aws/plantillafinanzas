"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardCharts({ series, expensesByCategory }: { series: { date: string; income: number; expense: number }[]; expensesByCategory: { name: string; value: number; color: string }[] }) {
  return <div className="grid gap-4 lg:grid-cols-3">
    <Card className="lg:col-span-2"><CardHeader><CardTitle>Evolución mensual</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="income" stroke="#155e75" fill="#b7d8e1" name="Ingresos" /><Area type="monotone" dataKey="expense" stroke="#c24a58" fill="#f3c7cc" name="Gastos" /></AreaChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader><CardTitle>Gastos por categoría</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={55}>{expensesByCategory.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
  </div>;
}
