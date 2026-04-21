import { describe, expect, it } from "vitest";
import { prepareTransactionUpsertRows } from "./prepare-transaction-import";

describe("prepareTransactionUpsertRows", () => {
  it("normalizes a feed transaction into the transactions schema shape", () => {
    const rows = prepareTransactionUpsertRows({
      userId: " user-123 ",
      transactions: [
        {
          source: " plaid ",
          sourceTransactionId: " tx-abc ",
          transactionDate: "2026-04-11",
          amount: 12.345,
          merchantName: " Coffee Shop ",
          description: " Morning latte ",
          notes: "  imported from bank feed  ",
          categoryId: " cat-coffee ",
        },
      ],
    });

    expect(rows).toEqual([
      {
        user_id: "user-123",
        category_id: "cat-coffee",
        transaction_date: "2026-04-11",
        amount: 12.35,
        merchant_name: "Coffee Shop",
        description: "Morning latte",
        source: "plaid",
        source_transaction_id: "tx-abc",
        notes: "imported from bank feed",
      },
    ]);
  });

  it("throws when the transaction date is not normalized", () => {
    expect(() =>
      prepareTransactionUpsertRows({
        userId: "user-123",
        transactions: [
          {
            source: "plaid",
            sourceTransactionId: "tx-abc",
            transactionDate: "04/11/2026",
            amount: 12,
          },
        ],
      })
    ).toThrow("transactions[0].transactionDate must be in YYYY-MM-DD format.");
  });

  it("throws when the source transaction id is missing", () => {
    expect(() =>
      prepareTransactionUpsertRows({
        userId: "user-123",
        transactions: [
          {
            source: "plaid",
            sourceTransactionId: " ",
            transactionDate: "2026-04-11",
            amount: 12,
          },
        ],
      })
    ).toThrow("transactions[0].sourceTransactionId is required.");
  });
});
