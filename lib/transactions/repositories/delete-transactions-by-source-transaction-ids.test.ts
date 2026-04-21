import { describe, expect, it, vi } from "vitest";
import { deleteTransactionsBySourceTransactionIds } from "./delete-transactions-by-source-transaction-ids";

describe("deleteTransactionsBySourceTransactionIds", () => {
  it("no-ops when there are no ids", async () => {
    const supabase = {
      from: vi.fn(),
    } as any;

    await expect(
      deleteTransactionsBySourceTransactionIds(supabase, {
        userId: "user-123",
        source: "plaid",
        sourceTransactionIds: [],
      })
    ).resolves.toBe(0);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes unique ids for the source and user", async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock2 = vi.fn().mockReturnValue({ in: inMock });
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock1 });
    const fromMock = vi.fn().mockReturnValue({ delete: deleteMock });
    const supabase = { from: fromMock } as any;

    await expect(
      deleteTransactionsBySourceTransactionIds(supabase, {
        userId: "user-123",
        source: "plaid",
        sourceTransactionIds: ["tx_1", "tx_1", " tx_2 "],
      })
    ).resolves.toBe(2);

    expect(fromMock).toHaveBeenCalledWith("transactions");
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock1).toHaveBeenCalledWith("user_id", "user-123");
    expect(inMock).toHaveBeenCalledWith("source_transaction_id", ["tx_1", "tx_2"]);
  });
});
