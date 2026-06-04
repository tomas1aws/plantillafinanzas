"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { getDashboardDateRange, isDashboardPeriod, type DashboardPeriod } from "@/lib/dashboard-period";

const storageKey = "dashboard-period-filter";
const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "current-month", label: "Mes actual" },
  { value: "previous-month", label: "Mes anterior" },
  { value: "last-3-months", label: "Últimos 3 meses" },
  { value: "last-6-months", label: "Últimos 6 meses" },
  { value: "current-year", label: "Año actual" },
  { value: "all", label: "Todo el historial" },
  { value: "custom", label: "Personalizado" },
];

export function DashboardPeriodFilter({
  currency,
  period,
  from,
  to,
  activeLabel,
}: {
  currency: "ARS" | "USD";
  period: DashboardPeriod;
  from: string | null;
  to: string | null;
  activeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(period);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  const navigate = (nextPeriod: DashboardPeriod, nextFrom?: string, nextTo?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    if (nextPeriod === "custom" && nextFrom && nextTo) {
      params.set("from", nextFrom);
      params.set("to", nextTo);
    } else {
      params.delete("from");
      params.delete("to");
    }
    localStorage.setItem(storageKey, JSON.stringify({ period: nextPeriod, from: nextFrom, to: nextTo }));
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (searchParams.has("period")) {
      localStorage.setItem(storageKey, JSON.stringify({ period, from, to }));
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { period?: string; from?: string; to?: string } | null;
      if (!saved || !isDashboardPeriod(saved.period)) return;
      const savedRange = getDashboardDateRange(saved);
      if (saved.period === "custom" && savedRange.period !== "custom") return;
      navigate(saved.period, saved.from, saved.to);
    } catch {
      localStorage.removeItem(storageKey);
    }
    // Only restore the saved filter on the initial visit without a period in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    navigate("custom", customFrom, customTo);
  };

  return <section className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><CalendarDays size={18} /><span>Período activo: {activeLabel}</span></div>
        <div className="flex flex-wrap gap-2">
          {([['today', 'Hoy'], ['current-month', 'Este mes'], ['current-year', 'Este año'], ['all', 'Todo']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => navigate(value)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${period === value ? "border-teal-700 bg-teal-700 text-white" : "bg-white text-slate-600 hover:border-teal-600 hover:text-teal-700"}`}>{label}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-xs font-medium text-slate-500">Moneda<SelectNative value={currency} onChange={(event) => { const params = new URLSearchParams(searchParams.toString()); params.set("currency", event.target.value); router.push(`${pathname}?${params.toString()}`); }}><option>ARS</option><option>USD</option></SelectNative></label>
        <label className="grid gap-1 text-xs font-medium text-slate-500">Período<SelectNative value={selectedPeriod} onChange={(event) => { const value = event.target.value as DashboardPeriod; setSelectedPeriod(value); if (value !== "custom") navigate(value); }}>{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectNative></label>
      </div>
    </div>
    {selectedPeriod === "custom" ? <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-medium text-slate-500">Fecha desde<Input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-500">Fecha hasta<Input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} /></label>
      <button type="button" disabled={!customFrom || !customTo || customFrom > customTo} onClick={applyCustom} className="h-10 rounded-xl bg-teal-700 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Aplicar período</button>
    </div> : null}
  </section>;
}
