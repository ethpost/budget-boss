import { describe, expect, it } from "vitest";
import { buildHistoricalContext } from "./build-historical-context";

describe("buildHistoricalContext", () => {
  it("builds a primary-driver historical context from category rows", () => {
    const result = buildHistoricalContext({
      lookbackDays: 90,
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      transactionRows: [
        { amount: 24.5 },
        { amount: 35.5 },
        { amount: 80 },
        { amount: Number.NaN },
      ],
    });

    expect(result).toEqual({
      historicalContext: {
        isAvailable: true,
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionCount: 3,
        averageComparableSpend: 46.67,
      },
      details: {
        minComparableSpend: 24.5,
        maxComparableSpend: 80,
      },
    });
  });

  it("returns null when there are no safely comparable transactions", () => {
    expect(
      buildHistoricalContext({
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionRows: [{ amount: Number.NaN }],
      })
    ).toBeNull();
  });
});
