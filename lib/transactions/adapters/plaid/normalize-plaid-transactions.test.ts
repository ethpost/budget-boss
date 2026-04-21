import { describe, expect, it } from "vitest";
import { normalizePlaidTransactions } from "./normalize-plaid-transactions";

describe("normalizePlaidTransactions", () => {
  it("maps confirmed Plaid transactions into the import contract", () => {
    const result = normalizePlaidTransactions({
      transactions: [
        {
          transaction_id: "tx_123",
          date: "2026-04-11",
          amount: 12.34,
          merchant_name: "Coffee Shop",
          name: "Coffee Shop Latte",
          pending: false,
        },
      ],
    });

    expect(result).toEqual({
      skippedPendingCount: 0,
      transactions: [
        {
          source: "plaid",
          sourceTransactionId: "tx_123",
          transactionDate: "2026-04-11",
          amount: 12.34,
          merchantName: "Coffee Shop",
          description: "Coffee Shop Latte",
          notes: null,
          categoryId: null,
        },
      ],
    });
  });

  it("skips pending transactions", () => {
    const result = normalizePlaidTransactions({
      transactions: [
        {
          transaction_id: "tx_pending",
          date: "2026-04-11",
          amount: 3,
          merchant_name: "Coffee Shop",
          pending: true,
        },
      ],
    });

    expect(result).toEqual({
      skippedPendingCount: 1,
      transactions: [],
    });
  });
});
