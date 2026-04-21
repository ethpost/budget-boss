// lib/budget-health/domain/get-period-context.ts

export type PeriodContext = {
  asOfDate: string;
  periodStartDate: string;
  periodEndDate: string;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInPeriod: number;
  elapsedFraction: number;
};

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseAsUtcDate(dateString: string): Date {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return date;
}

export function getPeriodContext(asOfDate: string): PeriodContext {
  const date = parseAsUtcDate(asOfDate);

  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();

  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  const totalDaysInPeriod = periodEnd.getUTCDate();
  const dayOfMonth = date.getUTCDate();

  const daysElapsed = dayOfMonth;
  const daysRemaining = totalDaysInPeriod - dayOfMonth;
  const elapsedFraction = daysElapsed / totalDaysInPeriod;

  return {
    asOfDate,
    periodStartDate: formatDate(periodStart),
    periodEndDate: formatDate(periodEnd),
    daysElapsed,
    daysRemaining,
    totalDaysInPeriod,
    elapsedFraction,
  };
}