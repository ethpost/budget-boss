import { describe, expect, it } from "vitest";
import { categorizeImportedTransactions } from "./categorize-imported-transactions";

const categories = [
  {
    categoryId: "cat-groceries",
    categoryName: "Groceries",
    categoryBehaviorType: "variable" as const,
  },
  {
    categoryId: "cat-restaurants",
    categoryName: "Restaurants",
    categoryBehaviorType: "discretionary" as const,
  },
  {
    categoryId: "cat-transportation",
    categoryName: "Transportation",
    categoryBehaviorType: "variable" as const,
  },
];

describe("categorizeImportedTransactions", () => {
  it("uses learned merchant history for high-confidence matches", () => {
    const result = categorizeImportedTransactions({
      activeCategories: categories,
      categorizedTransactionHistory: [
        {
          merchantName: "Trader Joe's",
          description: "Trader Joe's",
          categoryId: "cat-groceries",
        },
      ],
      transactions: [
        {
          source: "plaid",
          sourceTransactionId: "tx-1",
          transactionDate: "2026-05-01",
          amount: 20,
          merchantName: "TRADER JOES #1234",
          description: "TRADER JOES STORE",
        },
      ],
    });

    expect(result.transactions[0].categoryId).toBe("cat-groceries");
    expect(result.decisions[0]).toMatchObject({
      categorizationSource: "learned_merchant",
      categorizationConfidence: "high",
      needsReview: false,
    });
    expect(result.audit).toMatchObject({
      categorizedCount: 1,
      highConfidenceCount: 1,
      needsReviewCount: 0,
    });
  });

  it("uses Plaid metadata when it matches a category name", () => {
    const result = categorizeImportedTransactions({
      activeCategories: categories,
      categorizedTransactionHistory: [],
      transactions: [
        {
          source: "plaid",
          sourceTransactionId: "tx-1",
          transactionDate: "2026-05-01",
          amount: 12,
          merchantName: "Bus pass",
          plaidCategoryPrimary: "TRANSPORTATION",
          plaidCategoryDetailed: "TRANSPORTATION_PUBLIC_TRANSIT",
        },
      ],
    });

    expect(result.transactions[0].categoryId).toBe("cat-transportation");
    expect(result.decisions[0]).toMatchObject({
      categorizationSource: "plaid_metadata",
      categorizationConfidence: "medium",
    });
  });

  it("leaves ambiguous learned merchants for review", () => {
    const result = categorizeImportedTransactions({
      activeCategories: categories,
      categorizedTransactionHistory: [
        {
          merchantName: "Amazon",
          description: "Amazon",
          categoryId: "cat-groceries",
        },
        {
          merchantName: "Amazon",
          description: "Amazon",
          categoryId: "cat-restaurants",
        },
      ],
      transactions: [
        {
          source: "plaid",
          sourceTransactionId: "tx-1",
          transactionDate: "2026-05-01",
          amount: 40,
          merchantName: "Amazon",
        },
      ],
    });

    expect(result.transactions[0].categoryId).toBeNull();
    expect(result.decisions[0]).toMatchObject({
      categorizationSource: "learned_merchant",
      categorizationConfidence: "low",
      needsReview: true,
    });
  });
});
