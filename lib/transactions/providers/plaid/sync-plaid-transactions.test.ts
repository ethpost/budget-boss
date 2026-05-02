import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../repositories/delete-transactions-by-source-transaction-ids",
  () => ({
    deleteTransactionsBySourceTransactionIds: vi.fn().mockResolvedValue(1),
  })
);

vi.mock("../../../budget-setup/repositories/get-active-categories", () => ({
  getActiveCategories: vi.fn().mockResolvedValue([
    {
      categoryId: "cat-books",
      categoryName: "Books",
      categoryBehaviorType: "discretionary",
    },
  ]),
}));

vi.mock("../../repositories/get-transaction-categorization-history", () => ({
  getTransactionCategorizationHistory: vi.fn().mockResolvedValue([
    {
      merchantName: "Coffee Shop",
      description: "Coffee Shop Latte",
      categoryId: "cat-coffee",
    },
  ]),
}));

import { syncPlaidTransactions } from "./sync-plaid-transactions";

describe("syncPlaidTransactions", () => {
  it("fetches sync pages, normalizes confirmed rows, and upserts them", async () => {
    const transactionsSync = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          has_more: true,
          next_cursor: "cursor-1",
          added: [
            {
              transaction_id: "tx_1",
              date: "2026-04-11",
              amount: 12.34,
              merchant_name: "Coffee Shop",
              name: "Coffee Shop Latte",
              pending: false,
            },
          ],
          modified: [],
          removed: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          has_more: false,
          next_cursor: "cursor-2",
          added: [],
          modified: [
            {
              transaction_id: "tx_1",
              date: "2026-04-10",
              amount: 25,
              merchant_name: "Bookstore",
              name: "Books",
              pending: false,
            },
          ],
          removed: [{ transaction_id: "tx_removed" }],
        },
      });

    const plaidClient = { transactionsSync } as any;

    const deleteChain = vi.fn().mockResolvedValue({ error: null });
    const deleteEq2 = vi.fn().mockReturnValue({ in: deleteChain });
    const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq1 });

    const upsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: "tx-1" }],
      error: null,
    });
    const upsert = vi.fn().mockReturnValue({ select: upsertSelect });
    const from = vi.fn().mockReturnValue({ upsert, delete: deleteMock });
    const supabase = { from } as any;

    const result = await syncPlaidTransactions({
      plaidClient,
      supabase,
      userId: "user-123",
      accessToken: "access-sandbox-token",
      pageSize: 1,
    });

    expect(transactionsSync).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenCalledWith("transactions");
    expect(upsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-123",
          category_id: "cat-coffee",
          transaction_date: "2026-04-11",
          amount: 12.34,
          merchant_name: "Coffee Shop",
          description: "Coffee Shop Latte",
          source: "plaid",
          source_transaction_id: "tx_1",
          notes: null,
        },
      ],
      {
        onConflict: "user_id,source,source_transaction_id",
      }
    );
    expect(result).toEqual({
      fetchedCount: 2,
      importedCount: 1,
      skippedPendingCount: 0,
      autoCategorizedCount: 1,
      categorizationNeedsReviewCount: 0,
      removedCount: 1,
      upsertedCount: 1,
      nextCursor: "cursor-2",
    });
  });
});
