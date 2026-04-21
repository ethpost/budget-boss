import { describe, expect, it } from "vitest";
import { buildTrendBasedBudgetPlan } from "./build-trend-based-budget-plan";

describe("buildTrendBasedBudgetPlan", () => {
  it("builds proposed budgets from recent transaction trends", () => {
    const plan = buildTrendBasedBudgetPlan({
      activeCategories: [
        {
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
        },
        {
          categoryId: "cat-groceries",
          categoryName: "Groceries",
          categoryBehaviorType: "variable",
        },
      ],
      recentTransactions: [
        {
          categoryId: "cat-dining-out",
          amount: 30,
          transactionDate: "2026-04-10",
        },
        {
          categoryId: "cat-dining-out",
          amount: 45,
          transactionDate: "2026-03-20",
        },
        {
          categoryId: "cat-groceries",
          amount: 80,
          transactionDate: "2026-04-09",
        },
      ],
      lookbackDays: 90,
      currentMonthSpendByCategoryId: new Map([
        ["cat-dining-out", 20],
        ["cat-groceries", 85],
      ]),
    });

    expect(plan).toEqual({
      lookbackDays: 90,
      totalRecentSpend: 155,
      totalSuggestedBudget: 110,
      categories: [
        {
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          transactionCount: 2,
          recentSpend: 75,
          averageMonthlySpend: 25,
          suggestedMonthlyBudget: 25,
          budgetBasis: "2 transactions over the last 90 days",
        },
        {
          categoryId: "cat-groceries",
          categoryName: "Groceries",
          categoryBehaviorType: "variable",
          transactionCount: 1,
          recentSpend: 80,
          averageMonthlySpend: 26.67,
          suggestedMonthlyBudget: 85,
          budgetBasis: "1 transaction over the last 90 days",
        },
      ],
    });
  });
});
