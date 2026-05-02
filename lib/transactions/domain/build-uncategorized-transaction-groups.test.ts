import { describe, expect, it } from "vitest";
import { buildUncategorizedTransactionGroups } from "./build-uncategorized-transaction-groups";

describe("buildUncategorizedTransactionGroups", () => {
  it("groups similar merchant rows with store suffixes", () => {
    const groups = buildUncategorizedTransactionGroups([
      {
        sourceTransactionId: "tx-1",
        transactionDate: "2026-05-01",
        amount: 12,
        merchantName: "TRADER JOES #1234",
        description: "TRADER JOES STORE",
      },
      {
        sourceTransactionId: "tx-2",
        transactionDate: "2026-05-03",
        amount: 18.5,
        merchantName: "Trader Joe's",
        description: "Trader Joe's",
      },
    ]);

    expect(groups).toEqual([
      {
        groupKey: "trader joes",
        displayName: "TRADER JOES #1234",
        transactionCount: 2,
        totalAmount: 30.5,
        latestTransactionDate: "2026-05-03",
        sourceTransactionIds: ["tx-1", "tx-2"],
        sampleDescriptions: ["TRADER JOES STORE", "Trader Joe's"],
      },
    ]);
  });

  it("keeps unknown rows separate by source transaction id", () => {
    const groups = buildUncategorizedTransactionGroups([
      {
        sourceTransactionId: "tx-1",
        transactionDate: "2026-05-01",
        amount: 12,
        merchantName: null,
        description: null,
      },
    ]);

    expect(groups[0]).toMatchObject({
      groupKey: "transaction:tx-1",
      displayName: "Unknown merchant",
      transactionCount: 1,
    });
  });
});
