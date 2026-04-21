import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPeriodContextMock: vi.fn(),
  getActiveCategoryBudgetsMock: vi.fn(),
  getActualSpendToDateByCategoryMock: vi.fn(),
  getHistoricalTransactionHistoryMock: vi.fn(),
}));

vi.mock("./domain/get-period-context", () => ({
  getPeriodContext: mocks.getPeriodContextMock,
}));

vi.mock("./repositories/get-active-category-budgets", () => ({
  getActiveCategoryBudgets: mocks.getActiveCategoryBudgetsMock,
}));

vi.mock("./repositories/get-actual-spend-to-date-by-category", () => ({
  getActualSpendToDateByCategory: mocks.getActualSpendToDateByCategoryMock,
}));

vi.mock("./repositories/get-historical-transaction-history", () => ({
  getHistoricalTransactionHistory:
    mocks.getHistoricalTransactionHistoryMock,
}));

import { computeLiveBudgetHealth } from "./compute-live-budget-health";

describe("computeLiveBudgetHealth status/explanation alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getPeriodContextMock.mockReturnValue({
      asOfDate: "2026-04-11",
      periodStartDate: "2026-04-01",
      periodEndDate: "2026-04-30",
      daysElapsed: 11,
      daysRemaining: 19,
      totalDaysInPeriod: 30,
      elapsedFraction: 11 / 30,
    });

    mocks.getHistoricalTransactionHistoryMock.mockResolvedValue([]);
  });

  it("maps under_plan to under_budget when there has been some spend", async () => {
    mocks.getActiveCategoryBudgetsMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
        plannedBudgetAmount: 400,
      },
    ]);

    mocks.getActualSpendToDateByCategoryMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        actualSpendToDate: 50,
      },
    ]);

    const result = await computeLiveBudgetHealth({
      supabase: {} as any,
      asOfDate: "2026-04-11",
    });

    expect(result.totals.budgetHealthStatus).toBe("under_plan");
    expect(result.explanation.direction).toBe("under_budget");
    expect(result.explanation.historicalContext).toBeNull();
    expect(result.explanation.historicalSummary).toBeNull();
    expect(result.explanation.driverSummary).toBe(
      "Dining Out is the largest underrun: $50 spent against a $400 monthly target, and it is currently trending $264 below plan."
    );
  });

  it("maps on_plan to on_plan", async () => {
    mocks.getActiveCategoryBudgetsMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
        plannedBudgetAmount: 400,
      },
    ]);

    mocks.getActualSpendToDateByCategoryMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        actualSpendToDate: 146.67,
      },
    ]);

    const result = await computeLiveBudgetHealth({
      supabase: {} as any,
      asOfDate: "2026-04-11",
    });

    expect(result.totals.budgetHealthStatus).toBe("on_plan");
    expect(result.explanation.direction).toBe("on_plan");
    expect(result.explanation.historicalContext).toBeNull();
    expect(result.explanation.historicalSummary).toBeNull();
    expect(result.explanation.driverSummary).toBeNull();
  });

  it("maps over_plan to over_budget", async () => {
    mocks.getActiveCategoryBudgetsMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
        plannedBudgetAmount: 400,
      },
    ]);

    mocks.getActualSpendToDateByCategoryMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        actualSpendToDate: 220,
      },
    ]);

    const result = await computeLiveBudgetHealth({
      supabase: {} as any,
      asOfDate: "2026-04-11",
    });

    expect(result.totals.budgetHealthStatus).toBe("over_plan");
    expect(result.explanation.direction).toBe("over_budget");
    expect(result.explanation.historicalContext).toBeNull();
    expect(result.explanation.historicalSummary).toBeNull();
    expect(result.explanation.driverSummary).toBe(
      "Dining Out is the main over-budget driver: $220 spent against a $400 monthly target, and it is currently trending $200 above plan."
    );
  });

  it("includes category-aware historical context for the primary driver only", async () => {
    mocks.getActiveCategoryBudgetsMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
        plannedBudgetAmount: 400,
      },
    ]);

    mocks.getActualSpendToDateByCategoryMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        actualSpendToDate: 220,
      },
    ]);

    mocks.getHistoricalTransactionHistoryMock.mockResolvedValue([
      {
        amount: 25,
      },
      {
        amount: 35,
      },
      {
        amount: 80,
      },
    ]);

    const result = await computeLiveBudgetHealth({
      supabase: {} as any,
      asOfDate: "2026-04-11",
    });

    expect(result.totals.budgetHealthStatus).toBe("over_plan");
    expect(result.explanation.direction).toBe("over_budget");
    expect(result.explanation.historicalContext).toEqual({
      isAvailable: true,
      lookbackDays: 90,
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      transactionCount: 3,
      averageComparableSpend: 46.67,
    });
    expect(result.explanation.historicalSummary).toBe(
      "Over the last 90 days, Dining Out averaged $47 across 3 comparable transactions. This is a small sample, so treat it as directional."
    );
    expect(result.explanation.driverSummary).toBe(
      "Dining Out is the main over-budget driver: $220 spent against a $400 monthly target, and it is currently trending $200 above plan."
    );
    expect(result.explanation.driverSignal).toEqual({
      label: "Stability",
      value: "Small sample",
    });
  });

  it("keeps historical context null when there is no primary driver", async () => {
    mocks.getActiveCategoryBudgetsMock.mockResolvedValue([
      {
        categoryId: "cat-dining-out",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
        plannedBudgetAmount: 400,
      },
    ]);

    mocks.getActualSpendToDateByCategoryMock.mockResolvedValue([]);

    const result = await computeLiveBudgetHealth({
      supabase: {} as any,
      asOfDate: "2026-04-11",
    });

    expect(result.explanation.direction).toBe("on_plan");
    expect(result.explanation.summary).toBe(
      "You haven’t spent yet this month. Your full budget is still available."
    );
    expect(result.explanation.historicalContext).toBeNull();
    expect(result.explanation.historicalSummary).toBeNull();
    expect(result.explanation.driverSummary).toBeNull();
    expect(result.explanation.driverSignal).toBeNull();
  });
});
