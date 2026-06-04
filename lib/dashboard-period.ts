import { endOfMonth, endOfYear, format, isAfter, isValid, parseISO, startOfMonth, startOfYear, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export const dashboardPeriodValues = ["current-month", "previous-month", "last-3-months", "last-6-months", "current-year", "all", "custom", "today"] as const;
export type DashboardPeriod = (typeof dashboardPeriodValues)[number];

export type DashboardPeriodSelection = {
  period?: string;
  from?: string;
  to?: string;
};

export type DashboardDateRange = {
  period: DashboardPeriod;
  from: string | null;
  to: string | null;
  label: string;
};

const isoDate = (date: Date) => format(date, "yyyy-MM-dd");
const displayDate = (date: string) => format(parseISO(date), "dd/MM/yyyy");
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function isIsoDate(value?: string): value is string {
  if (!value) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && isoDate(parsed) === value;
}

export function isDashboardPeriod(value?: string): value is DashboardPeriod {
  return dashboardPeriodValues.includes(value as DashboardPeriod);
}

export function getDashboardDateRange(selection: DashboardPeriodSelection, today = new Date()): DashboardDateRange {
  const requestedPeriod = isDashboardPeriod(selection.period) ? selection.period : "current-month";
  let period = requestedPeriod;
  let from: string | null;
  let to: string | null;
  let label: string;

  switch (requestedPeriod) {
    case "today":
      from = isoDate(today);
      to = from;
      label = "Hoy";
      break;
    case "previous-month": {
      const previousMonth = subMonths(today, 1);
      from = isoDate(startOfMonth(previousMonth));
      to = isoDate(endOfMonth(previousMonth));
      label = capitalize(format(previousMonth, "MMMM yyyy", { locale: es }));
      break;
    }
    case "last-3-months":
      from = isoDate(startOfMonth(subMonths(today, 2)));
      to = isoDate(endOfMonth(today));
      label = "Últimos 3 meses";
      break;
    case "last-6-months":
      from = isoDate(startOfMonth(subMonths(today, 5)));
      to = isoDate(endOfMonth(today));
      label = "Últimos 6 meses";
      break;
    case "current-year":
      from = isoDate(startOfYear(today));
      to = isoDate(endOfYear(today));
      label = `Año ${format(today, "yyyy")}`;
      break;
    case "all":
      from = null;
      to = null;
      label = "Todo el historial";
      break;
    case "custom": {
      const customFrom = isIsoDate(selection.from) ? selection.from : null;
      const customTo = isIsoDate(selection.to) ? selection.to : null;
      if (!customFrom || !customTo || isAfter(parseISO(customFrom), parseISO(customTo))) {
        period = "current-month";
        from = isoDate(startOfMonth(today));
        to = isoDate(endOfMonth(today));
        label = capitalize(format(today, "MMMM yyyy", { locale: es }));
      } else {
        from = customFrom;
        to = customTo;
        label = `${displayDate(customFrom)} - ${displayDate(customTo)}`;
      }
      break;
    }
    case "current-month":
    default:
      from = isoDate(startOfMonth(today));
      to = isoDate(endOfMonth(today));
      label = capitalize(format(today, "MMMM yyyy", { locale: es }));
      break;
  }

  return { period, from, to, label };
}
