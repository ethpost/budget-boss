import { describe, expect, it } from "vitest";
import { buildBuyingBehaviorEvidence } from "./build-buying-behavior-evidence";

const budgetHealth = {
  score: 0.12,
  status: "over_plan" as const,
  projectedMonthEndVariance: 120,
  plannedBudgetAmount: 2000,
  actualSpendToDate: 900,
  summary: "Projected spend is running over plan.",
  confidence: "medium" as const,
  primaryDriverCategoryName: "Dining",
};

describe("buildBuyingBehaviorEvidence", () => {
  it("ranks category and merchant signals by meaningful spend deltas", () => {
    const evidence = buildBuyingBehaviorEvidence({
      question: "Where am I spending differently?",
      asOfDate: "2026-05-15",
      periodStartDate: "2026-05-01",
      daysElapsed: 15,
      totalDaysInPeriod: 31,
      budgetHealth,
      categories: [
        {
          categoryId: "cat-dining",
          categoryName: "Dining",
          plannedBudgetAmount: 400,
          actualSpendToDate: 260,
          projectedVarianceAmount: 95,
        },
        {
          categoryId: "cat-groceries",
          categoryName: "Groceries",
          plannedBudgetAmount: 600,
          actualSpendToDate: 220,
          projectedVarianceAmount: -20,
        },
      ],
      transactions: [
        {
          transactionDate: "2026-05-12",
          amount: 140,
          merchantName: "Cafe Alto",
          description: null,
          categoryId: "cat-dining",
        },
        {
          transactionDate: "2026-05-08",
          amount: 120,
          merchantName: "Cafe Alto",
          description: null,
          categoryId: "cat-dining",
        },
        {
          transactionDate: "2026-04-12",
          amount: 60,
          merchantName: "Cafe Alto",
          description: null,
          categoryId: "cat-dining",
        },
        {
          transactionDate: "2026-03-12",
          amount: 60,
          merchantName: "Cafe Alto",
          description: null,
          categoryId: "cat-dining",
        },
        {
          transactionDate: "2026-05-10",
          amount: 220,
          merchantName: "Market",
          description: null,
          categoryId: "cat-groceries",
        },
        {
          transactionDate: "2026-04-10",
          amount: 210,
          merchantName: "Market",
          description: null,
          categoryId: "cat-groceries",
        },
      ],
    });

    expect(evidence.categorySignals[0]).toMatchObject({
      categoryName: "Dining",
      currentMonthSpend: 260,
      spendDeltaVsBaseline: expect.any(Number),
      projectedVarianceAmount: 95,
    });
    expect(evidence.merchantSignals[0]).toMatchObject({
      merchantName: "Cafe Alto",
      currentMonthSpend: 260,
      categoryName: "Dining",
    });
    expect(evidence.recurringMerchantCandidates[0]).toMatchObject({
      merchantName: "Cafe Alto",
    });
  });

  it("adds caveats for thin current-month and baseline evidence", () => {
    const evidence = buildBuyingBehaviorEvidence({
      question: "Is dining the problem?",
      asOfDate: "2026-05-04",
      periodStartDate: "2026-05-01",
      daysElapsed: 4,
      totalDaysInPeriod: 31,
      budgetHealth,
      categories: [
        {
          categoryId: "cat-dining",
          categoryName: "Dining",
          plannedBudgetAmount: 400,
          actualSpendToDate: 25,
          projectedVarianceAmount: 0,
        },
      ],
      transactions: [
        {
          transactionDate: "2026-05-03",
          amount: 25,
          merchantName: "Coffee",
          description: null,
          categoryId: "cat-dining",
        },
      ],
    });

    expect(evidence.caveats).toEqual(
      expect.arrayContaining([
        "Only 1 current-month Plaid transactions are in the evidence.",
        "The baseline has 0 transactions, so comparisons may be directional.",
        "The month is 13% complete, so pace-based conclusions should stay conservative.",
      ])
    );
  });
});
