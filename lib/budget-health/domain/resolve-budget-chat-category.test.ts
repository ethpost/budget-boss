import { describe, expect, it } from "vitest";
import { resolveBudgetChatCategorySelection } from "./resolve-budget-chat-category";

describe("resolveBudgetChatCategorySelection", () => {
  const categories = [
    {
      categoryId: "cat-dining-out",
      categoryName: "Dining Out",
      categoryBehaviorType: "discretionary" as const,
      actualSpendToDate: 876,
      plannedBudgetAmount: 400,
      projectedVarianceAmount: 476,
      href: "/chat?category=cat-dining-out",
      dashboardHref: "/?category=cat-dining-out",
    },
    {
      categoryId: "cat-groceries",
      categoryName: "Groceries",
      categoryBehaviorType: "variable" as const,
      actualSpendToDate: 491,
      plannedBudgetAmount: 1000,
      projectedVarianceAmount: -509,
      href: "/chat?category=cat-groceries",
      dashboardHref: "/?category=cat-groceries",
    },
  ];

  it("resolves a category switch command", () => {
    const result = resolveBudgetChatCategorySelection({
      message: "Show me Dining Out",
      categories,
    });

    expect(result?.categoryId).toBe("cat-dining-out");
  });

  it("resolves a focus command", () => {
    const result = resolveBudgetChatCategorySelection({
      message: "Focus on Groceries",
      categories,
    });

    expect(result?.categoryId).toBe("cat-groceries");
  });

  it("does not switch on non-category questions", () => {
    const result = resolveBudgetChatCategorySelection({
      message: "What is driving this?",
      categories,
    });

    expect(result).toBeNull();
  });
});
