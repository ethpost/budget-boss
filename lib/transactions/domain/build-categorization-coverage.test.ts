import { describe, expect, it } from "vitest";
import { buildCategorizationCoverage } from "./build-categorization-coverage";

describe("buildCategorizationCoverage", () => {
  it("computes categorized spend coverage using absolute spend amounts", () => {
    expect(
      buildCategorizationCoverage([
        { amount: 25, categoryId: "cat-food" },
        { amount: -10, categoryId: "cat-refund" },
        { amount: 15, categoryId: null },
      ])
    ).toEqual({
      transactionCount: 3,
      categorizedTransactionCount: 2,
      uncategorizedTransactionCount: 1,
      totalSpendAmount: 50,
      categorizedSpendAmount: 35,
      uncategorizedSpendAmount: 15,
      categorizedSpendCoverageRatio: 0.7,
    });
  });

  it("treats an empty month as fully covered", () => {
    expect(buildCategorizationCoverage([])).toEqual({
      transactionCount: 0,
      categorizedTransactionCount: 0,
      uncategorizedTransactionCount: 0,
      totalSpendAmount: 0,
      categorizedSpendAmount: 0,
      uncategorizedSpendAmount: 0,
      categorizedSpendCoverageRatio: 1,
    });
  });
});
