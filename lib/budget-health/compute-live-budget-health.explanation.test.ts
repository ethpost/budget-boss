import { describe, expect, it } from "vitest";
import {
  buildBudgetHealthExplanation,
  type BudgetHealthExplanation,
  type BudgetHealthExplanationCategoryInput,
} from "./domain/build-budget-health-explanation";

function makeCategory(
  overrides: Partial<BudgetHealthExplanationCategoryInput> = {}
): BudgetHealthExplanationCategoryInput {
  return {
    categoryId: overrides.categoryId ?? crypto.randomUUID(),
    categoryName: overrides.categoryName ?? "Category",
    categoryBehaviorType: overrides.categoryBehaviorType,
    actualSpendToDate: overrides.actualSpendToDate ?? 0,
    plannedBudgetAmount: overrides.plannedBudgetAmount ?? 0,
    projectedVarianceAmount: overrides.projectedVarianceAmount ?? 0,
  };
}

describe("buildBudgetHealthExplanation", () => {
  it("returns over-budget summary with top 2 over-budget drivers", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 180,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 320,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: 120,
        }),
        makeCategory({
          categoryId: "cat-entertainment",
          categoryName: "Entertainment",
          actualSpendToDate: 160,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 60,
        }),
        makeCategory({
          categoryId: "cat-groceries",
          categoryName: "Groceries",
          actualSpendToDate: 60,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: -40,
        }),
      ],
    });

    expect(result.direction).toBe("over_budget");
    expect(result.confidence).toBe("high");
    expect(result.primaryDriverCategoryId).toBe("cat-dining-out");
    expect(result.summary).toBe(
      "You are on track to finish $180 over budget, driven mainly by Dining Out and Entertainment."
    );
    expect(result.driverSummary).toBe(
      "Dining Out is the main over-budget driver: $320 spent against a $200 monthly target, and it is currently trending $120 above plan."
    );

    expect(result.topOverBudgetCategories).toHaveLength(2);
    expect(result.topOverBudgetCategories[0]).toMatchObject({
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      projectedVarianceAmount: 120,
    });
    expect(result.topOverBudgetCategories[1]).toMatchObject({
      categoryId: "cat-entertainment",
      categoryName: "Entertainment",
      projectedVarianceAmount: 60,
    });

    expect(result.topUnderBudgetCategories).toHaveLength(1);
    expect(result.topUnderBudgetCategories[0]).toMatchObject({
      categoryId: "cat-groceries",
      categoryName: "Groceries",
      projectedVarianceAmount: -40,
    });
  });

  it("returns a softer over-budget summary when confidence is low", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 180,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.1,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 320,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: 120,
        }),
        makeCategory({
          categoryId: "cat-entertainment",
          categoryName: "Entertainment",
          actualSpendToDate: 160,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 60,
        }),
      ],
    });

    expect(result.direction).toBe("over_budget");
    expect(result.confidence).toBe("low");
    expect(result.summary).toBe(
      "Early in the month, you are currently pacing to be $180 over budget, driven mainly by Dining Out and Entertainment."
    );
  });

  it("returns under-budget summary with singular underrun wording", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: -400,
      plannedBudgetAmount: 400,
      elapsedFraction: 0.4,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "fixed",
          actualSpendToDate: 50,
          plannedBudgetAmount: 400,
          projectedVarianceAmount: -400,
        }),
      ],
    });

    expect(result.direction).toBe("under_budget");
    expect(result.confidence).toBe("medium");
    expect(result.primaryDriverCategoryId).toBe("cat-dining-out");
    expect(result.summary).toBe(
      "You are projected to be $400 under budget, with the largest underrun in Dining Out."
    );
    expect(result.driverSummary).toBe(
      "Dining Out is the largest underrun: $50 spent against a $400 planned amount, and it is projected to finish $400 below plan."
    );

    expect(result.topOverBudgetCategories).toEqual([]);
    expect(result.topUnderBudgetCategories).toHaveLength(1);
    expect(result.topUnderBudgetCategories[0]).toMatchObject({
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      projectedVarianceAmount: -400,
    });
  });

  it("returns under-budget summary with plural underruns wording", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: -250,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.4,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 40,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: -150,
        }),
        makeCategory({
          categoryId: "cat-entertainment",
          categoryName: "Entertainment",
          actualSpendToDate: 30,
          plannedBudgetAmount: 150,
          projectedVarianceAmount: -100,
        }),
        makeCategory({
          categoryId: "cat-travel",
          categoryName: "Travel",
          actualSpendToDate: 90,
          plannedBudgetAmount: 50,
          projectedVarianceAmount: 40,
        }),
      ],
    });

    expect(result.direction).toBe("under_budget");
    expect(result.confidence).toBe("medium");
    expect(result.primaryDriverCategoryId).toBe("cat-dining-out");
    expect(result.summary).toBe(
      "You are projected to be $250 under budget, with the largest underruns in Dining Out and Entertainment."
    );
    expect(result.driverSummary).toBe(
      "Dining Out is the largest underrun: $40 spent against a $200 monthly target, and it is currently trending $150 below plan."
    );

    expect(result.topUnderBudgetCategories).toHaveLength(2);
    expect(result.topUnderBudgetCategories[0]).toMatchObject({
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      projectedVarianceAmount: -150,
    });
    expect(result.topUnderBudgetCategories[1]).toMatchObject({
      categoryId: "cat-entertainment",
      categoryName: "Entertainment",
      projectedVarianceAmount: -100,
    });
  });

  it("returns a softer under-budget summary when confidence is low", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: -250,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.1,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 40,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: -150,
        }),
        makeCategory({
          categoryId: "cat-entertainment",
          categoryName: "Entertainment",
          actualSpendToDate: 30,
          plannedBudgetAmount: 150,
          projectedVarianceAmount: -100,
        }),
      ],
    });

    expect(result.direction).toBe("under_budget");
    expect(result.confidence).toBe("low");
    expect(result.summary).toBe(
      "Early in the month, you are currently pacing to be $250 under budget, with the largest underruns in Dining Out and Entertainment."
    );
  });

  it("returns on-plan summary when inside tolerance band", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 10,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.1,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "fixed",
          actualSpendToDate: 10,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 10,
        }),
      ],
    });

    expect(result.direction).toBe("on_plan");
    expect(result.confidence).toBe("low");
    expect(result.primaryDriverCategoryId).toBeNull();
    expect(result.summary).toBe(
      "Early in the month, you appear on track to finish the month on budget."
    );
    expect(result.driverSummary).toBeNull();
  });

  it("caps driver lists at 2 categories", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 300,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          actualSpendToDate: 250,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 150,
        }),
        makeCategory({
          categoryId: "cat-entertainment",
          categoryName: "Entertainment",
          actualSpendToDate: 200,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 100,
        }),
        makeCategory({
          categoryId: "cat-shopping",
          categoryName: "Shopping",
          actualSpendToDate: 150,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 50,
        }),
        makeCategory({
          categoryId: "cat-groceries",
          categoryName: "Groceries",
          actualSpendToDate: 80,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: -20,
        }),
        makeCategory({
          categoryId: "cat-travel",
          categoryName: "Travel",
          actualSpendToDate: 40,
          plannedBudgetAmount: 50,
          projectedVarianceAmount: -10,
        }),
        makeCategory({
          categoryId: "cat-gas",
          categoryName: "Gas",
          actualSpendToDate: 45,
          plannedBudgetAmount: 50,
          projectedVarianceAmount: -5,
        }),
      ],
    });

    expect(result.direction).toBe("over_budget");
    expect(result.confidence).toBe("high");
    expect(result.primaryDriverCategoryId).toBe("cat-dining-out");

    expect(result.topOverBudgetCategories).toHaveLength(2);
    expect(result.topOverBudgetCategories.map((x) => x.categoryName)).toEqual([
      "Dining Out",
      "Entertainment",
    ]);

    expect(result.topUnderBudgetCategories).toHaveLength(2);
    expect(result.topUnderBudgetCategories.map((x) => x.categoryName)).toEqual([
      "Groceries",
      "Travel",
    ]);
  });

  it("returns no-spend-yet summary with low confidence early in the month", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: -400,
      plannedBudgetAmount: 400,
      elapsedFraction: 0.1,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          actualSpendToDate: 0,
          plannedBudgetAmount: 400,
          projectedVarianceAmount: -400,
        }),
      ],
    });

    expect(result.direction).toBe("on_plan");
    expect(result.confidence).toBe("low");
    expect(result.primaryDriverCategoryId).toBeNull();
    expect(result.summary).toBe(
      "You haven’t spent yet this month. Your full budget is still available."
    );
    expect(result.historicalSummary).toBeNull();
  });

  it("preserves an optional historical context payload when provided", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 180,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      historicalContext: {
        isAvailable: true,
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionCount: 12,
        averageComparableSpend: 42.5,
      },
      historicalContextDetails: {
        minComparableSpend: 40,
        maxComparableSpend: 50,
      },
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 320,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: 120,
        }),
      ],
    });

    expect(result.historicalContext).toEqual({
      isAvailable: true,
      lookbackDays: 90,
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      transactionCount: 12,
      averageComparableSpend: 42.5,
    });
    expect(result.historicalSummary).toBe(
      "Over the last 90 days, Dining Out averaged $43 across 12 comparable transactions. Recent spending here looks fairly steady."
    );
    expect(result.driverSignal).toEqual({
      label: "Stability",
      value: "Steady",
    });
  });

  it("returns a small-sample stability signal when history is limited", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 180,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      historicalContext: {
        isAvailable: true,
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionCount: 3,
        averageComparableSpend: 46.67,
      },
      historicalContextDetails: {
        minComparableSpend: 25,
        maxComparableSpend: 80,
      },
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          categoryBehaviorType: "discretionary",
          actualSpendToDate: 320,
          plannedBudgetAmount: 200,
          projectedVarianceAmount: 120,
        }),
      ],
    });

    expect(result.driverSignal).toEqual({
      label: "Stability",
      value: "Small sample",
    });
  });

  it("returns null historical summary when historical context is null", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 10,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      historicalContext: null,
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          actualSpendToDate: 10,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 10,
        }),
      ],
    });

    expect(result.historicalContext).toBeNull();
    expect(result.historicalSummary).toBeNull();
    expect(result.driverSummary).toBeNull();
    expect(result.driverSignal).toBeNull();
  });

  it("adds a small-sample caution when there are fewer than five comparable transactions", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 10,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      historicalContext: {
        isAvailable: true,
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionCount: 3,
        averageComparableSpend: 46.67,
      },
      historicalContextDetails: {
        minComparableSpend: 25,
        maxComparableSpend: 80,
      },
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          actualSpendToDate: 10,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 10,
        }),
      ],
    });

    expect(result.historicalSummary).toBe(
      "Over the last 90 days, Dining Out averaged $47 across 3 comparable transactions. This is a small sample, so treat it as directional."
    );
  });

  it("adds a variability note when the recent spread is wide", () => {
    const result: BudgetHealthExplanation = buildBudgetHealthExplanation({
      projectedMonthEndVariance: 10,
      plannedBudgetAmount: 1000,
      elapsedFraction: 0.7,
      historicalContext: {
        isAvailable: true,
        lookbackDays: 90,
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        transactionCount: 6,
        averageComparableSpend: 50,
      },
      historicalContextDetails: {
        minComparableSpend: 10,
        maxComparableSpend: 90,
      },
      categories: [
        makeCategory({
          categoryId: "cat-dining-out",
          categoryName: "Dining Out",
          actualSpendToDate: 10,
          plannedBudgetAmount: 100,
          projectedVarianceAmount: 10,
        }),
      ],
    });

    expect(result.historicalSummary).toBe(
      "Over the last 90 days, Dining Out averaged $50 across 6 comparable transactions. Recent spending here varies quite a bit."
    );
  });
});
