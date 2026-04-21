export type BudgetHealthExplanationHistoricalContext = {
  isAvailable: boolean;
  lookbackDays: number;
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  averageComparableSpend: number | null;
};

export type BudgetHealthHistoricalContextDetails = {
  minComparableSpend: number | null;
  maxComparableSpend: number | null;
};

export type HistoricalContextBuildResult = {
  historicalContext: BudgetHealthExplanationHistoricalContext;
  details: BudgetHealthHistoricalContextDetails;
};

export type HistoricalTransactionHistoryInput = {
  amount: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildHistoricalContext(params: {
  lookbackDays: number;
  categoryId: string;
  categoryName: string;
  transactionRows: HistoricalTransactionHistoryInput[];
}): HistoricalContextBuildResult | null {
  const { lookbackDays, categoryId, categoryName, transactionRows } = params;

  if (!categoryId || !categoryName) {
    return null;
  }

  const comparableRows = transactionRows.filter((row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount);
  });

  if (comparableRows.length === 0) {
    return null;
  }

  const totalComparableSpend = comparableRows.reduce((sum, row) => {
    return sum + Number(row.amount);
  }, 0);
  const spendValues = comparableRows.map((row) => Number(row.amount));
  const minComparableSpend = Math.min(...spendValues);
  const maxComparableSpend = Math.max(...spendValues);

  return {
    historicalContext: {
      isAvailable: true,
      lookbackDays,
      categoryId,
      categoryName,
      transactionCount: comparableRows.length,
      averageComparableSpend: roundCurrency(
        totalComparableSpend / comparableRows.length
      ),
    },
    details: {
      minComparableSpend: roundCurrency(minComparableSpend),
      maxComparableSpend: roundCurrency(maxComparableSpend),
    },
  };
}
