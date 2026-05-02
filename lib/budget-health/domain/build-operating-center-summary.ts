export type OperatingCenterHealthStatus = "ready" | "watch" | "needs_review";

export type OperatingCenterSummary = {
  status: OperatingCenterHealthStatus;
  headline: string;
  coverageLabel: string;
  nextActionLabel: string;
};

export function buildOperatingCenterSummary(params: {
  projectedMonthEndVariance: number;
  categorizedSpendCoverageRatio: number;
  uncategorizedTransactionCount: number;
  reviewGroupCount: number;
}): OperatingCenterSummary {
  const coveragePercent = Math.round(params.categorizedSpendCoverageRatio * 100);
  const absoluteVariance = Math.abs(params.projectedMonthEndVariance);

  if (
    params.reviewGroupCount > 0 ||
    params.categorizedSpendCoverageRatio < 0.8
  ) {
    return {
      status: "needs_review",
      headline:
        params.reviewGroupCount > 0
          ? `${params.reviewGroupCount} merchant group${
              params.reviewGroupCount === 1 ? "" : "s"
            } need review before Budget Health is fully grounded.`
          : "Categorization coverage is low for the current month.",
      coverageLabel: `${coveragePercent}% of current-month Plaid spend is categorized.`,
      nextActionLabel: "Review uncategorized transactions",
    };
  }

  if (absoluteVariance >= 50) {
    return {
      status: "watch",
      headline:
        params.projectedMonthEndVariance > 0
          ? "Budget Health is covered, and projected spend is running over plan."
          : "Budget Health is covered, and projected spend is running under plan.",
      coverageLabel: `${coveragePercent}% of current-month Plaid spend is categorized.`,
      nextActionLabel: "Inspect the primary driver",
    };
  }

  return {
    status: "ready",
    headline: "Budget Health is covered and currently near plan.",
    coverageLabel: `${coveragePercent}% of current-month Plaid spend is categorized.`,
    nextActionLabel: "Monitor new sync activity",
  };
}
