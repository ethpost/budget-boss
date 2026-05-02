import { describe, expect, it } from "vitest";
import { buildOperatingCenterSummary } from "./build-operating-center-summary";

describe("buildOperatingCenterSummary", () => {
  it("prioritizes review when merchant groups need attention", () => {
    expect(
      buildOperatingCenterSummary({
        projectedMonthEndVariance: 20,
        categorizedSpendCoverageRatio: 0.95,
        uncategorizedTransactionCount: 4,
        reviewGroupCount: 2,
      })
    ).toMatchObject({
      status: "needs_review",
      nextActionLabel: "Review uncategorized transactions",
    });
  });

  it("flags driver inspection when coverage is strong and variance is meaningful", () => {
    expect(
      buildOperatingCenterSummary({
        projectedMonthEndVariance: 120,
        categorizedSpendCoverageRatio: 0.9,
        uncategorizedTransactionCount: 0,
        reviewGroupCount: 0,
      })
    ).toMatchObject({
      status: "watch",
      nextActionLabel: "Inspect the primary driver",
    });
  });

  it("returns ready when coverage is strong and variance is near plan", () => {
    expect(
      buildOperatingCenterSummary({
        projectedMonthEndVariance: 12,
        categorizedSpendCoverageRatio: 1,
        uncategorizedTransactionCount: 0,
        reviewGroupCount: 0,
      })
    ).toEqual({
      status: "ready",
      headline: "Budget Health is covered and currently near plan.",
      coverageLabel: "100% of current-month Plaid spend is categorized.",
      nextActionLabel: "Monitor new sync activity",
    });
  });
});
