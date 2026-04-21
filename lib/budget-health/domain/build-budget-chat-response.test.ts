import { describe, expect, it } from "vitest";
import { buildBudgetChatResponse } from "./build-budget-chat-response";

describe("buildBudgetChatResponse", () => {
  const context = {
    asOfDate: "2026-04-12",
    budgetHealthScore: -0.095,
    projectedMonthEndVariance: 476,
    direction: "over_budget" as const,
    confidence: "medium" as const,
    summary:
      "You are projected to be $476 over budget, driven mainly by Dining Out.",
    driverSummary:
      "Dining Out is the main over-budget driver: $876 spent against a $400 monthly target, and it is currently trending $476 above plan.",
    historicalSummary:
      "Over the last 90 days, Dining Out averaged $73 across 4 comparable transactions.",
    primaryDriverCategoryName: "Dining Out",
    selectedCategoryName: "Dining Out",
    selectedCategoryBehaviorType: "discretionary" as const,
    selectedCategoryActualSpendToDate: 876,
    selectedCategoryPlannedBudgetAmount: 400,
    selectedCategoryProjectedVarianceAmount: 476,
    selectedCategoryHref: "/?category=cat-dining-out",
    topOverBudgetCategories: [
      { categoryName: "Dining Out", projectedVarianceAmount: 476 },
    ],
    topUnderBudgetCategories: [
      { categoryName: "Groceries", projectedVarianceAmount: -509 },
    ],
    period: {
      daysElapsed: 12,
      totalDaysInPeriod: 30,
    },
  };

  it("summarizes the driver when asked why", () => {
    const result = buildBudgetChatResponse({
      message: "What is driving this?",
      context,
    });

    expect(result).toContain("You are projected to be $476 over budget");
    expect(result).toContain("Dining Out is the main over-budget driver");
  });

  it("returns historical context when asked about history", () => {
    const result = buildBudgetChatResponse({
      message: "What does history say?",
      context,
    });

    expect(result).toContain("Over the last 90 days, Dining Out averaged $73");
    expect(result).toContain("reference-only");
  });

  it("returns a confidence explanation", () => {
    const result = buildBudgetChatResponse({
      message: "How confident are you?",
      context,
    });

    expect(result).toContain("Confidence is medium");
    expect(result).toContain("40% of the month complete");
  });

  it("returns selected category context when asked to show the category", () => {
    const result = buildBudgetChatResponse({
      message: "Show me this category",
      context,
    });

    expect(result).toContain("Dining Out is currently a discretionary category");
    expect(result).toContain("$876 spent against $400 planned");
  });

  it("falls back to a helpful prompt", () => {
    const result = buildBudgetChatResponse({
      message: "hello",
      context,
    });

    expect(result).toContain("Ask me about Dining Out");
  });
});
