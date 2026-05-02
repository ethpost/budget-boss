export type CategorizationCoverageInputRow = {
  amount: number;
  categoryId: string | null;
};

export type CategorizationCoverage = {
  transactionCount: number;
  categorizedTransactionCount: number;
  uncategorizedTransactionCount: number;
  totalSpendAmount: number;
  categorizedSpendAmount: number;
  uncategorizedSpendAmount: number;
  categorizedSpendCoverageRatio: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildCategorizationCoverage(
  rows: CategorizationCoverageInputRow[]
): CategorizationCoverage {
  let categorizedTransactionCount = 0;
  let totalSpendAmount = 0;
  let categorizedSpendAmount = 0;

  for (const row of rows) {
    const amount = Number.isFinite(row.amount) ? Math.abs(row.amount) : 0;
    totalSpendAmount += amount;

    if (row.categoryId) {
      categorizedTransactionCount += 1;
      categorizedSpendAmount += amount;
    }
  }

  const totalSpend = roundCurrency(totalSpendAmount);
  const categorizedSpend = roundCurrency(categorizedSpendAmount);
  const uncategorizedSpend = roundCurrency(totalSpend - categorizedSpend);

  return {
    transactionCount: rows.length,
    categorizedTransactionCount,
    uncategorizedTransactionCount: rows.length - categorizedTransactionCount,
    totalSpendAmount: totalSpend,
    categorizedSpendAmount: categorizedSpend,
    uncategorizedSpendAmount: uncategorizedSpend,
    categorizedSpendCoverageRatio:
      totalSpend > 0 ? roundRatio(categorizedSpend / totalSpend) : 1,
  };
}
