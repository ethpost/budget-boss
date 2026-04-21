import { describe, expect, it, vi } from "vitest";
import { getRecentTransactions } from "./get-recent-transactions";

describe("getRecentTransactions", () => {
  it("loads recent plaid transactions for a user", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          transaction_date: "2026-04-12",
          amount: 18.75,
          merchant_name: "Coffee Shop",
          description: "Latte",
          source: "plaid",
          source_transaction_id: "tx-1",
          notes: "Imported from bank feed",
          category_id: "cat-coffee",
        },
      ],
      error: null,
    });
    const order2 = vi.fn().mockReturnValue({ limit });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const eqSource = vi.fn().mockReturnValue({ order: order1 });
    const eqUser = vi.fn().mockReturnValue({ eq: eqSource });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await getRecentTransactions({
      supabase,
      userId: "user-123",
      source: "plaid",
      limit: 1,
    });

    expect(from).toHaveBeenCalledWith("transactions");
    expect(select).toHaveBeenCalledWith(
      "transaction_date, amount, merchant_name, description, source, source_transaction_id, notes, category_id"
    );
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-123");
    expect(eqSource).toHaveBeenCalledWith("source", "plaid");
    expect(order1).toHaveBeenCalledWith("transaction_date", { ascending: false });
    expect(order2).toHaveBeenCalledWith("source_transaction_id", { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual([
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
    ]);
  });
});
