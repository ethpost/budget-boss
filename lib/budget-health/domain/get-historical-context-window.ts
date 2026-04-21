// lib/budget-health/domain/get-historical-context-window.ts

export type HistoricalContextWindow = {
  lookbackWindowDays: number;
  lookbackWindowStartDate: string;
  lookbackWindowEndDate: string;
};

function parseAsUtcDate(dateString: string): Date {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return date;
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

export function getHistoricalContextWindow(
  asOfDate: string,
  lookbackWindowDays = 90
): HistoricalContextWindow {
  if (lookbackWindowDays <= 0) {
    throw new Error(`Invalid lookback window days: ${lookbackWindowDays}`);
  }

  const endDate = parseAsUtcDate(asOfDate);
  const startDate = subtractDays(endDate, lookbackWindowDays - 1);

  return {
    lookbackWindowDays,
    lookbackWindowStartDate: formatDate(startDate),
    lookbackWindowEndDate: formatDate(endDate),
  };
}
