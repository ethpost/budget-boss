import { describe, expect, it } from "vitest";
import { buildTransactionImportAudit } from "./build-transaction-import-audit";

describe("buildTransactionImportAudit", () => {
  it("summarizes recent transaction imports", () => {
    const audit = buildTransactionImportAudit([
      {
        transactionDate: "2026-04-12",
        amount: 18.75,
        merchantName: "Coffee Shop",
        description: "Latte",
        source: "plaid",
        sourceTransactionId: "tx-1",
        notes: "Imported from bank feed",
        categoryId: "cat-coffee",
      },
      {
        transactionDate: "2026-04-10",
        amount: 24,
        merchantName: "Grocery Store",
        description: "Groceries",
        source: "plaid",
        sourceTransactionId: "tx-2",
        notes: null,
        categoryId: "cat-groceries",
      },
      {
        transactionDate: "2026-04-11",
        amount: 7,
        merchantName: null,
        description: "Snack",
        source: "csv",
        sourceTransactionId: "tx-3",
        notes: null,
        categoryId: null,
      },
    ]);

    expect(audit).toEqual({
      transactionCount: 3,
      totalAmount: 49.75,
      categorizedTransactionCount: 2,
      uncategorizedTransactionCount: 1,
      noteCount: 1,
      sourceCount: 2,
      sources: [
        { source: "plaid", count: 2 },
        { source: "csv", count: 1 },
      ],
      categories: [
        { categoryId: "cat-coffee", count: 1 },
        { categoryId: "cat-groceries", count: 1 },
      ],
      earliestTransactionDate: "2026-04-10",
      latestTransactionDate: "2026-04-12",
    });
  });
});
